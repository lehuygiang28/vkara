import { Elysia, t } from 'elysia';
import { ElysiaWS } from 'elysia/dist/ws';
import * as mongoose from 'mongoose';
import youtubeSr from 'youtube-sr';
import cors from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import serverTiming from '@elysiajs/server-timing';
import { rateLimit } from 'elysia-rate-limit';

import { syncFromMongoDB, syncToMongoDB } from '@/mongodb-sync';
import {
    cleanUpRoomField,
    cleanUpVideoField,
    generateRandomNumber,
    isNullish,
    shuffleArray,
} from '@/utils/common';
import { wsLogger, roomLogger, createContextLogger } from '@/utils/logger';
import { ErrorCode, RoomError } from '@/errors';
import { scheduleCleanupJobs } from '@/queues/cleanup';
import { scheduleSyncRedisToDb } from '@/queues/sync';
import type { ClientMessage, ServerMessage, Room, ClientInfo, YouTubeVideo } from '@/types';

import { redis } from './redis';
import { checkEmbeddable, searchYoutubeiElysia } from './youtubei';

const serverLogger = createContextLogger('Server');
const IS_ENCRYPTED_PASSWORD = process.env.IS_ENCRYPTED_PASSWORD === 'true';

if (process.env.MONGODB_URI) {
    mongoose
        .connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })
        .then(() => {
            serverLogger.info('MongoDB connected');
            scheduleSyncRedisToDb().catch((error) => {
                serverLogger.error('Failed to schedule Redis to DB sync', { error });
            });
        })
        .catch((error) => {
            serverLogger.error('MongoDB connection error', { error });
            // Retry connection after delay
            setTimeout(() => {
                serverLogger.info('Retrying MongoDB connection...');
                mongoose
                    .connect(process.env.MONGODB_URI!)
                    .then(() => {
                        serverLogger.info('MongoDB connected after retry');
                    })
                    .catch((retryError) => {
                        serverLogger.error('MongoDB retry connection error', { error: retryError });
                    });
            }, 5000);
        });
}

export const wsConnections = new Map<string, ElysiaWS>();

// Core utilities
export function sendToClient(ws: ElysiaWS, message: ServerMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        serverLogger.error('Failed to send message to client', { error, clientId: ws.id });
    }
}

function handleError(ws: ElysiaWS, error: Error | RoomError): void {
    if (error instanceof RoomError) {
        sendToClient(ws, {
            type: 'errorWithCode',
            code: error.code,
            message: error.message,
        });
    } else {
        sendToClient(ws, {
            type: 'error',
            message: 'An unexpected error occurred',
        });
        serverLogger.error('Unexpected error', { error, clientId: ws.id });
    }
}

// Room utilities
async function validateRoom(roomId: string, isRejoin = false): Promise<Room> {
    if (!roomId || typeof roomId !== 'string') {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Room ID must be a valid string');
    }

    const roomData = await redis.get(`room:${roomId}`);
    if (!roomData) {
        throw new RoomError(isRejoin ? ErrorCode.REJOIN_ROOM_NOT_FOUND : ErrorCode.ROOM_NOT_FOUND);
    }

    try {
        return JSON.parse(roomData);
    } catch (error) {
        serverLogger.error('Failed to parse room data', { roomId, error });
        throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to parse room data');
    }
}

async function validateClientInRoom(ws: ElysiaWS): Promise<string> {
    const roomId = await findRoomIdByClient(ws);
    if (!roomId) {
        throw new RoomError(ErrorCode.NOT_IN_ROOM);
    }
    return roomId;
}

async function getClientInfo(wsId: string): Promise<ClientInfo | null> {
    const clientInfo = await redis.hgetall(`client:${wsId}`);
    return clientInfo.roomId ? { id: wsId, roomId: clientInfo.roomId } : null;
}

async function findRoomIdByClient(ws: ElysiaWS): Promise<string | undefined> {
    const clientInfo = await getClientInfo(ws.id);
    return clientInfo?.roomId;
}

async function roomIdExists(roomId: string): Promise<boolean> {
    return Boolean(await redis.exists(`room:${roomId}`));
}

// Room operations
async function createRoom(ws: ElysiaWS, password?: string) {
    let roomId: string;
    let roomExists: boolean;

    do {
        roomId = generateRandomNumber({ digits: 6 }).toString();
        roomExists = await roomIdExists(roomId);
    } while (roomExists);

    roomLogger.info(`Creating new room`, { roomId, creatorId: ws.id });

    const room: Room = {
        id: roomId,
        password: !IS_ENCRYPTED_PASSWORD
            ? password
            : !isNullish(password)
            ? await Bun.password.hash(password, {
                  algorithm: 'bcrypt',
                  cost: 4,
              })
            : undefined,
        clients: [ws.id],
        videoQueue: [],
        historyQueue: [],
        volume: 100,
        playingNow: null,
        lastActivity: Date.now(),
        creatorId: ws.id,
        isPlaying: false,
        currentTime: 0,
    };

    await redis.set(`room:${roomId}`, JSON.stringify(room));
    await joinRoomInternal(ws, roomId);
    sendToClient(ws, { type: 'roomCreated', roomId });
}

async function joinRoom(ws: ElysiaWS, roomId: string, password?: string, isRejoin = false) {
    const room = await validateRoom(roomId, isRejoin);

    if (!isNullish(password) && !isNullish(room?.password)) {
        const isPasswordValid = IS_ENCRYPTED_PASSWORD
            ? await Bun.password.verify(password, room.password)
            : password === room.password;

        if (!isPasswordValid) {
            throw new RoomError(ErrorCode.INCORRECT_PASSWORD);
        }
    }

    await joinRoomInternal(ws, roomId);
    await updateRoomActivity(roomId);
}

async function joinRoomInternal(ws: ElysiaWS, roomId: string) {
    await leaveCurrentRoom(ws);

    const room = await validateRoom(roomId);

    if (!room.clients.includes(ws.id)) {
        room.clients.push(ws.id);
        await redis.set(`room:${roomId}`, JSON.stringify(room));
    }

    ws.subscribe(roomId);

    await Promise.all([
        redis.hset(`client:${ws.id}`, 'roomId', roomId),
        sendToClient(ws, { type: 'roomJoined', yourId: ws.id, room: cleanUpRoomField(room) }),
    ]);
}

async function leaveRoom(ws: ElysiaWS) {
    await leaveCurrentRoom(ws);
    sendToClient(ws, { type: 'leftRoom' });
}

async function leaveCurrentRoom(ws: ElysiaWS) {
    const clientInfo = await getClientInfo(ws.id);
    if (clientInfo?.roomId) {
        ws.unsubscribe(clientInfo.roomId);
        const room = await validateRoom(clientInfo.roomId);
        room.clients = room.clients.filter((id) => id !== ws.id);
        await redis.set(`room:${clientInfo.roomId}`, JSON.stringify(room));
        await redis.hdel(`client:${ws.id}`, 'roomId');
        await updateRoomActivity(clientInfo.roomId);
    }
}

async function handleCloseRoom(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (room.creatorId !== ws.id) {
        throw new RoomError(ErrorCode.NOT_CREATOR_OF_ROOM);
    }

    await closeRoom(roomId);
}

export async function closeRoom(roomId: string, reason = 'Room closed by creator') {
    const room = await validateRoom(roomId);

    for (const clientId of room.clients) {
        const ws = wsConnections.get(clientId);
        if (ws) {
            ws.unsubscribe(roomId);
            sendToClient(ws, {
                type: 'roomClosed',
                reason,
            });
        }
    }

    await Promise.all([
        redis.del(`room:${roomId}`),
        ...room.clients.map((clientId) => redis.hdel(`client:${clientId}`, 'roomId')),
    ]);
}

// Video operations
async function addVideo(ws: ElysiaWS, video: YouTubeVideo): Promise<void> {
    if (!video || !video.id) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video data');
    }

    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (room.videoQueue.some((v) => v.id === video.id)) {
        throw new RoomError(ErrorCode.ALREADY_IN_QUEUE);
    }

    try {
        const isEmbeddable = await checkEmbeddable(video.id);
        if (!isEmbeddable) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        if (!room?.playingNow && room?.videoQueue?.length <= 0) {
            room.playingNow = video;
            room.isPlaying = true;
            room.currentTime = 0;
        } else {
            room.videoQueue = [...room.videoQueue, video];
        }
        room.lastActivity = Date.now();

        await Promise.all([
            redis.set(`room:${roomId}`, JSON.stringify(room)),
            broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
        ]);
    } catch (error) {
        if (error instanceof RoomError) {
            throw error;
        }
        serverLogger.error('Failed to add video', { videoId: video.id, error });
        throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to add video');
    }
}

async function playVideoNow(ws: ElysiaWS, video: YouTubeVideo) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (!(await checkEmbeddable(video.id))) {
        throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
    }

    // Remove the video that would be played now from the queue and history
    room.historyQueue = room.historyQueue.filter((v) => v.id !== video.id);
    room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);

    // Move the currently playing video to history
    if (room.playingNow && room.playingNow.id) {
        // If the video is not in history, add it to history
        // If the video is in history, move it to the top
        room.historyQueue = [
            room.playingNow,
            ...room.historyQueue?.filter((v) => v.id !== room.playingNow!.id),
        ];
    }

    room.playingNow = video;
    room.isPlaying = true;
    room.currentTime = 0;
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function nextVideo(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    // Move the currently playing video to history
    // If the video is not in history, add it to history
    // If the video is in history, move it to the top
    if (room.playingNow && room.playingNow.id) {
        room.historyQueue = [
            room.playingNow,
            ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
        ];
    }

    if (room.videoQueue.length > 0) {
        // If there are videos in the queue, play the next video
        const nextVideo = room.videoQueue.shift()!;
        room.playingNow = nextVideo;
        room.isPlaying = true;
        room.currentTime = 0;
    } else {
        // If there are no videos in the queue, stop playing
        room.playingNow = null;
        room.isPlaying = false;
        room.currentTime = 0;
    }

    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

// Playback operations
async function setVolume(ws: ElysiaWS, volume: number): Promise<void> {
    const roomId = await validateClientInRoom(ws);

    await updateRoom(roomId, (room) => {
        room.volume = Math.min(100, Math.max(0, volume));
    });

    await broadcastToRoom(roomId, {
        type: 'volumeChanged',
        volume: (await getRoomWithCache(roomId)).volume,
    });
}

async function play(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.isPlaying = true;
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'play' }),
    ]);
}

async function pause(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.isPlaying = false;
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'pause' }),
    ]);
}

async function seek(ws: ElysiaWS, time: number) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.currentTime = time;
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'currentTimeChanged', currentTime: time }),
    ]);
}

async function replay(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (!room.playingNow) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'No video is currently playing');
    }

    room.currentTime = 0;
    room.isPlaying = true;
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'replay' }),
    ]);
}

async function moveVideoToTop(ws: ElysiaWS, videoId: string) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    const videoForMove = room.videoQueue.find((v) => v.id === videoId);
    if (!videoForMove) {
        throw new RoomError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found in queue');
    }

    room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
    room.videoQueue.unshift(videoForMove);
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function shuffleQueue(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.videoQueue = shuffleArray(room.videoQueue);
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function clearQueue(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.videoQueue = [];
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function clearHistory(ws: ElysiaWS) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.historyQueue = [];
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function removeVideoFromQueue(ws: ElysiaWS, videoId: string) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function addVideoAndMoveToTop(ws: ElysiaWS, video: YouTubeVideo) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (!(await checkEmbeddable(video.id))) {
        throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
    }

    room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);

    if (!room?.playingNow && room?.videoQueue?.length <= 0) {
        room.playingNow = video;
        room.isPlaying = true;
        room.currentTime = 0;
    } else {
        room.videoQueue = [video, ...room.videoQueue];
    }
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

async function importPlaylist(ws: ElysiaWS, playlistUrlOrId: string) {
    const roomId = await validateClientInRoom(ws);
    const room = await validateRoom(roomId);

    if (!playlistUrlOrId.startsWith('http') && !playlistUrlOrId.includes('youtube.com')) {
        playlistUrlOrId = `https://www.youtube.com/playlist?list=${playlistUrlOrId}&playnext=1`;
    }
    const url = new URL(playlistUrlOrId);
    url.searchParams.set('playnext', '1');

    const results = await youtubeSr.getPlaylist(url.toString(), { fetchAll: true, limit: 200 });
    const videoCandidates = results.videos.map(cleanUpVideoField);

    // Batch processing with a limit of 50 videos per batch
    const batchSize = 50;
    const timeoutMs = 100; // Timeout between batches
    const embeddableVideos = [];

    for (let i = 0; i < videoCandidates.length; i += batchSize) {
        const batch = videoCandidates.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batch.map(async (video) => {
                const isNotInQueue = !room.videoQueue.some((q) => q.id === video.id);
                if (isNotInQueue && (await checkEmbeddable(video.id))) {
                    return video;
                }
                return null;
            }),
        );

        // Filter out null results
        embeddableVideos.push(...batchResults.filter((video) => video !== null));

        // Wait for timeout before processing the next batch
        if (i + batchSize < videoCandidates.length) {
            await new Promise((resolve) => setTimeout(resolve, timeoutMs));
        }
    }

    // Add the embeddable videos to the room queue
    room.videoQueue = [...room.videoQueue, ...embeddableVideos];
    room.lastActivity = Date.now();

    if (!room?.playingNow && room?.videoQueue?.length > 0) {
        room.playingNow = room.videoQueue.shift()!;
        room.isPlaying = true;
        room.currentTime = 0;
    }

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);
}

// Broadcasting utilities
async function broadcastToRoom(roomId: string, message: ServerMessage): Promise<void> {
    wsServer.server?.publish(roomId, JSON.stringify(message));
}

async function updateRoomActivity(roomId: string) {
    const room = await validateRoom(roomId);
    room.lastActivity = Date.now();
    await redis.set(`room:${roomId}`, JSON.stringify(room));
}

// Optimize room update with memoization and batch updates
const roomCache = new Map<string, { room: Room; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds cache TTL

async function getRoomWithCache(roomId: string): Promise<Room> {
    const now = Date.now();
    const cached = roomCache.get(roomId);

    if (cached && now - cached.timestamp < CACHE_TTL) {
        return cached.room;
    }

    const room = await validateRoom(roomId);
    roomCache.set(roomId, { room, timestamp: now });
    return room;
}

async function updateRoom(roomId: string, updater: (room: Room) => void): Promise<Room> {
    const room = await getRoomWithCache(roomId);

    updater(room);
    room.lastActivity = Date.now();

    await Promise.all([
        redis.set(`room:${roomId}`, JSON.stringify(room)),
        broadcastToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) }),
    ]);

    // Update cache
    roomCache.set(roomId, { room, timestamp: Date.now() });

    return room;
}

// Add type guard for client messages
function isValidClientMessage(message: unknown): message is ClientMessage {
    if (!message || typeof message !== 'object') return false;

    const msg = message as Record<string, unknown>;
    if (!msg.type || typeof msg.type !== 'string') return false;

    return true;
}

// Handler for incoming messages from clients
async function handleMessage(ws: ElysiaWS, message: unknown): Promise<void> {
    if (!isValidClientMessage(message)) {
        sendToClient(ws, {
            type: 'error',
            message: 'Invalid message format',
        });
        return;
    }

    try {
        if (message?.requiresAck && message.id) {
            sendToClient(ws, { type: 'ack', messageId: message.id });
        }

        switch (message.type) {
            case 'ping':
                sendToClient(ws, { type: 'pong' });
                break;

            case 'createRoom':
                await createRoom(ws, message.password);
                break;

            case 'joinRoom':
                await joinRoom(ws, message.roomId, message.password);
                break;

            case 'reJoinRoom':
                // With set isRejoin to true will throw REJOIN_ROOM_NOT_FOUND
                await joinRoom(ws, message.roomId, message.password, true);
                break;

            case 'leaveRoom':
                await leaveRoom(ws);
                break;

            case 'closeRoom':
                await handleCloseRoom(ws);
                break;

            case 'sendMessage':
                const roomId = await validateClientInRoom(ws);
                await broadcastToRoom(roomId, {
                    type: 'message',
                    sender: ws.id,
                    content: message.message,
                });
                break;

            case 'addVideo':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await addVideo(ws, message.video);
                break;

            case 'playNow':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await playVideoNow(ws, message.video);
                break;

            case 'nextVideo':
                await nextVideo(ws);
                break;

            case 'setVolume':
                if (typeof message.volume !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid volume value');
                }
                await setVolume(ws, message.volume);
                break;

            case 'replay':
                await replay(ws);
                break;

            case 'play':
                await play(ws);
                break;

            case 'pause':
                await pause(ws);
                break;

            case 'seek':
                if (typeof message.time !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid time value');
                }
                await seek(ws, message.time);
                break;

            case 'videoFinished':
                await nextVideo(ws);
                break;

            case 'moveToTop':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await moveVideoToTop(ws, message.videoId);
                break;

            case 'shuffleQueue':
                await shuffleQueue(ws);
                break;

            case 'clearQueue':
                await clearQueue(ws);
                break;

            case 'clearHistory':
                await clearHistory(ws);
                break;

            case 'removeVideoFromQueue':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await removeVideoFromQueue(ws, message.videoId);
                break;

            case 'addVideoAndMoveToTop':
                if (!message.video) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Missing video data');
                }
                await addVideoAndMoveToTop(ws, message.video);
                break;

            case 'importPlaylist':
                if (!message.playlistUrlOrId || typeof message.playlistUrlOrId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid playlist URL or ID');
                }
                await importPlaylist(ws, message.playlistUrlOrId);
                break;

            default:
                throw new RoomError(
                    ErrorCode.INVALID_MESSAGE,
                    `Unknown message type: ${(message as { type: string }).type}`,
                );
        }
    } catch (error) {
        handleError(ws, error instanceof Error ? error : new Error('Unknown error'));
    }
}

export const wsServer = new Elysia({
    websocket: {
        idleTimeout: 960,
        maxPayloadLength: 1024 * 1024, // 1MB max payload
    },
})
    .on('start', async () => {
        serverLogger.info('Server started');
        // Sync data from MongoDB to Redis on startup
        await syncFromMongoDB(redis).catch((error) => {
            serverLogger.error('Failed to sync from MongoDB', { error });
        });
        scheduleCleanupJobs().catch((error) => {
            serverLogger.error('Failed to schedule cleanup jobs', { error });
        });
    })
    .on('stop', async () => {
        serverLogger.info('Server stop initiated');
        try {
            await syncToMongoDB(redis);
            await redis.quit();
            await mongoose.disconnect();
            await wsServer.stop();
            serverLogger.info('Server stopped successfully');
        } catch (error) {
            serverLogger.error('Error during server shutdown', { error });
        }
    })
    .state('wsConnections', wsConnections)
    .ws('/ws', {
        schema: {
            body: t.Object({
                type: t.String(),
                payload: t.Any(),
            }),
        },
        open: async (ws) => {
            wsLogger.info(`Client connected`, { clientId: ws.id });
            wsConnections.set(ws.id, ws);
            sendToClient(ws, { type: 'pong' });
        },
        close: async (ws) => {
            wsLogger.info(`Client disconnected`, { clientId: ws.id });
            try {
                await leaveCurrentRoom(ws);
                wsConnections.delete(ws.id);
            } catch (error) {
                wsLogger.error('Error during client disconnect cleanup', {
                    clientId: ws.id,
                    error,
                });
            }
        },
        message: (ws, message: ClientMessage) => handleMessage(ws, message),
    })
    .use(cors())
    .use(swagger())
    .use(serverTiming())
    .use(
        rateLimit({
            scoping: 'global',
            generator: (req, server) =>
                // get client ip via cloudflare header first
                req.headers.get('CF-Connecting-IP') ??
                // if not found, fallback to default generator
                server?.requestIP(req)?.address ??
                '',
            // max 20 requests per duration
            max: 20,
            // milliseconds
            duration: 1000,
        }),
    )
    .use(searchYoutubeiElysia)
    .listen(process.env.PORT || 8000);

// Setup graceful shutdown
process.on('beforeExit', async () => {
    serverLogger.info('Server stopping due to beforeExit event');
    await syncToMongoDB(redis).catch((error) => {
        serverLogger.error('Failed to sync to MongoDB during shutdown', { error });
    });
    await redis.quit().catch((error) => {
        serverLogger.error('Error closing Redis connection', { error });
    });
    await mongoose.disconnect().catch((error) => {
        serverLogger.error('Error disconnecting from MongoDB', { error });
    });
    await wsServer.stop().catch((error) => {
        serverLogger.error('Error stopping WebSocket server', { error });
    });
});

// Handle signals for more graceful shutdown
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
        serverLogger.info(`Server stopping due to ${signal} signal`);
        // Allow 5 seconds for cleanup
        setTimeout(() => {
            serverLogger.warn('Forced exit after timeout');
            process.exit(1);
        }, 5000);

        try {
            await syncToMongoDB(redis);
            await redis.quit();
            await mongoose.disconnect();
            await wsServer.stop();
            serverLogger.info('Clean shutdown completed');
            process.exit(0);
        } catch (error) {
            serverLogger.error('Error during shutdown', { error });
            process.exit(1);
        }
    });
});
