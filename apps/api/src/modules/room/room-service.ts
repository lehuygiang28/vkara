import type { ElysiaWS } from 'elysia/ws';
import youtubeSr from 'youtube-sr';

import {
    cleanUpRoomField,
    cleanUpVideoField,
    generateRandomNumber,
    shuffleArray,
} from '@/utils/common';
import { roomLogger, createContextLogger } from '@/utils/logger';
import {
    ErrorCode,
    RoomError,
    shouldBroadcastPlaybackTime,
    type PlaybackTimeSyncState,
    type ClientInfo,
    type ClientMessage,
    type Room,
    type ServerMessage,
    type YouTubeVideo,
} from '@vkara/shared-types';
import { publishToRoom } from '@/modules/room/room-broadcast';
import { checkEmbeddable, checkEmbeddableMany } from '@/modules/youtube/embeddable';
import { redis } from '@/redis';
import {
    isVideoAlreadyInRoom,
    mutateRoom,
    requireRoom,
    writeRoom,
} from '@/utils/room-store';

const serviceLogger = createContextLogger('RoomService');

export type RoomServiceDeps = {
    wsConnections: Map<string, ElysiaWS>;
    sendToClient: (ws: ElysiaWS, message: ServerMessage) => void;
};

function normalizeRoomPassword(password?: string): string | undefined {
    const trimmed = password?.trim();
    return trimmed ? trimmed : undefined;
}

function broadcastRoomState(roomId: string, room: Room): void {
    publishToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) });
}

async function getClientInfo(wsId: string): Promise<ClientInfo | null> {
    const clientInfo = await redis.hgetall(`client:${wsId}`);
    return clientInfo.roomId ? { id: wsId, roomId: clientInfo.roomId } : null;
}

async function findRoomIdByClient(ws: ElysiaWS): Promise<string | undefined> {
    const clientInfo = await getClientInfo(ws.id);
    return clientInfo?.roomId;
}

async function validateClientInRoom(ws: ElysiaWS): Promise<string> {
    const roomId = await findRoomIdByClient(ws);
    if (!roomId) {
        throw new RoomError(ErrorCode.NOT_IN_ROOM);
    }
    return roomId;
}

async function roomIdExists(roomId: string): Promise<boolean> {
    return Boolean(await redis.exists(`room:${roomId}`));
}

/** Throttles currentTime WS spam per room. */
const lastPlaybackBroadcastByRoom = new Map<string, PlaybackTimeSyncState>();

export function createRoomService({ wsConnections, sendToClient }: RoomServiceDeps) {
    async function leaveCurrentRoom(ws: ElysiaWS) {
        const clientInfo = await getClientInfo(ws.id);
        if (!clientInfo?.roomId) return;

        ws.unsubscribe(clientInfo.roomId);
        await mutateRoom(clientInfo.roomId, (room) => {
            room.clients = room.clients.filter((id) => id !== ws.id);
            if (room.clients.length === 0) {
                room.emptySince = Date.now();
            }
        });
        await redis.hdel(`client:${ws.id}`, 'roomId');
    }

    async function joinRoomInternal(ws: ElysiaWS, roomId: string) {
        await leaveCurrentRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            if (!room.clients.includes(ws.id)) {
                room.clients.push(ws.id);
                delete room.emptySince;
            } else if (room.emptySince) {
                delete room.emptySince;
            }
        });

        ws.subscribe(roomId);
        await redis.hset(`client:${ws.id}`, 'roomId', roomId);
        sendToClient(ws, { type: 'roomJoined', yourId: ws.id, room: cleanUpRoomField(room) });
    }

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
            password: normalizeRoomPassword(password),
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

        await writeRoom(roomId, room);
        await joinRoomInternal(ws, roomId);
        sendToClient(ws, { type: 'roomCreated', roomId });
    }

    async function joinRoom(
        ws: ElysiaWS,
        roomId: string,
        password?: string,
        isRejoin = false,
    ) {
        const room = await requireRoom(roomId, isRejoin);

        const expectedPassword = normalizeRoomPassword(room.password);
        if (expectedPassword) {
            const providedPassword = normalizeRoomPassword(password) ?? '';
            if (providedPassword !== expectedPassword) {
                throw new RoomError(ErrorCode.INCORRECT_PASSWORD);
            }
        }

        await joinRoomInternal(ws, roomId);
    }

    async function leaveRoom(ws: ElysiaWS) {
        await leaveCurrentRoom(ws);
        sendToClient(ws, { type: 'leftRoom' });
    }

    async function closeRoom(roomId: string, reason = 'Room closed by creator') {
        const room = await requireRoom(roomId);
        lastPlaybackBroadcastByRoom.delete(roomId);

        for (const clientId of room.clients) {
            const clientWs = wsConnections.get(clientId);
            if (clientWs) {
                clientWs.unsubscribe(roomId);
                sendToClient(clientWs, { type: 'roomClosed', reason });
            }
        }

        await Promise.all([
            redis.del(`room:${roomId}`),
            ...room.clients.map((clientId) => redis.hdel(`client:${clientId}`, 'roomId')),
        ]);
    }

    async function handleCloseRoom(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await requireRoom(roomId);

        if (room.creatorId !== ws.id) {
            throw new RoomError(ErrorCode.NOT_CREATOR_OF_ROOM);
        }

        await closeRoom(roomId);
    }

    async function addVideo(ws: ElysiaWS, video: YouTubeVideo): Promise<void> {
        if (!video?.id) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video data');
        }

        const roomId = await validateClientInRoom(ws);

        try {
            if (!(await checkEmbeddable(video.id))) {
                throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
            }

            const room = await mutateRoom(roomId, (room) => {
                if (isVideoAlreadyInRoom(room, video.id)) {
                    throw new RoomError(ErrorCode.ALREADY_IN_QUEUE);
                }

                if (!room.playingNow && room.videoQueue.length <= 0) {
                    room.playingNow = video;
                    room.isPlaying = true;
                    room.currentTime = 0;
                    lastPlaybackBroadcastByRoom.delete(roomId);
                } else {
                    room.videoQueue = [...room.videoQueue, video];
                }
            });

            broadcastRoomState(roomId, room);
        } catch (error) {
            if (error instanceof RoomError) throw error;
            serviceLogger.error('Failed to add video', { videoId: video.id, error });
            throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to add video');
        }
    }

    async function playVideoNow(ws: ElysiaWS, video: YouTubeVideo) {
        const roomId = await validateClientInRoom(ws);

        if (!(await checkEmbeddable(video.id))) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        const room = await mutateRoom(roomId, (room) => {
            room.historyQueue = room.historyQueue.filter((v) => v.id !== video.id);
            room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);

            if (room.playingNow?.id) {
                room.historyQueue = [
                    room.playingNow,
                    ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                ];
            }

            room.playingNow = video;
            room.isPlaying = true;
            room.currentTime = 0;
            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
    }

    async function nextVideo(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            if (room.playingNow?.id) {
                room.historyQueue = [
                    room.playingNow,
                    ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                ];
            }

            if (room.videoQueue.length > 0) {
                room.playingNow = room.videoQueue.shift()!;
                room.isPlaying = true;
                room.currentTime = 0;
            } else {
                room.playingNow = null;
                room.isPlaying = false;
                room.currentTime = 0;
            }

            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
    }

    async function setVolume(ws: ElysiaWS, volume: number): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const clamped = Math.min(100, Math.max(0, volume));

        const room = await mutateRoom(roomId, (room) => {
            room.volume = clamped;
        });

        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'volumeChanged', volume: room.volume });
    }

    async function play(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.isPlaying = true;
        });
        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'play' });
    }

    async function pause(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.isPlaying = false;
        });
        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'pause' });
    }

    async function seek(ws: ElysiaWS, time: number) {
        const roomId = await validateClientInRoom(ws);
        let previousTime = 0;

        await mutateRoom(roomId, (room) => {
            previousTime = room.currentTime;
            room.currentTime = time;
        });

        const lastBroadcast = lastPlaybackBroadcastByRoom.get(roomId);
        if (!shouldBroadcastPlaybackTime(lastBroadcast, time, previousTime)) {
            return;
        }

        lastPlaybackBroadcastByRoom.set(roomId, { at: Date.now(), seconds: time });
        publishToRoom(roomId, { type: 'currentTimeChanged', currentTime: time });
    }

    async function replay(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            if (!room.playingNow) {
                throw new RoomError(ErrorCode.INVALID_MESSAGE, 'No video is currently playing');
            }
            room.currentTime = 0;
            room.isPlaying = true;
            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
        publishToRoom(roomId, { type: 'replay' });
    }

    async function moveVideoToTop(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            const videoForMove = room.videoQueue.find((v) => v.id === videoId);
            if (!videoForMove) {
                throw new RoomError(ErrorCode.VIDEO_NOT_FOUND, 'Video not found in queue');
            }
            room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
            room.videoQueue.unshift(videoForMove);
        });

        broadcastRoomState(roomId, room);
    }

    async function shuffleQueue(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = shuffleArray(room.videoQueue);
        });
        broadcastRoomState(roomId, room);
    }

    async function clearQueue(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = [];
        });
        broadcastRoomState(roomId, room);
    }

    async function clearHistory(ws: ElysiaWS) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.historyQueue = [];
        });
        broadcastRoomState(roomId, room);
    }

    async function removeVideoFromQueue(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.videoQueue = room.videoQueue.filter((v) => v.id !== videoId);
        });
        broadcastRoomState(roomId, room);
    }

    async function addVideoAndMoveToTop(ws: ElysiaWS, video: YouTubeVideo) {
        const roomId = await validateClientInRoom(ws);

        if (!(await checkEmbeddable(video.id))) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        const room = await mutateRoom(roomId, (room) => {
            if (isVideoAlreadyInRoom(room, video.id)) {
                room.videoQueue = room.videoQueue.filter((v) => v.id !== video.id);
            }

            if (!room.playingNow && room.videoQueue.length <= 0) {
                room.playingNow = video;
                room.isPlaying = true;
                room.currentTime = 0;
                lastPlaybackBroadcastByRoom.delete(roomId);
            } else {
                room.videoQueue = [video, ...room.videoQueue];
            }
        });

        broadcastRoomState(roomId, room);
    }

    async function importPlaylist(ws: ElysiaWS, playlistUrlOrId: string) {
        const roomId = await validateClientInRoom(ws);

        if (!playlistUrlOrId.startsWith('http') && !playlistUrlOrId.includes('youtube.com')) {
            playlistUrlOrId = `https://www.youtube.com/playlist?list=${playlistUrlOrId}&playnext=1`;
        }
        const url = new URL(playlistUrlOrId);
        url.searchParams.set('playnext', '1');

        const results = await youtubeSr.getPlaylist(url.toString(), { fetchAll: true, limit: 200 });
        const videoCandidates = results.videos.map(cleanUpVideoField);
        const embedResults = await checkEmbeddableMany(videoCandidates.map((video) => video.id));
        const embeddableIds = new Set(
            embedResults.filter((result) => result.canEmbed).map((result) => result.videoId),
        );
        const embeddableVideos = videoCandidates.filter((video) => embeddableIds.has(video.id));

        const room = await mutateRoom(roomId, (room) => {
            const existingIds = new Set([
                ...room.videoQueue.map((v) => v.id),
                ...(room.playingNow?.id ? [room.playingNow.id] : []),
            ]);
            const newVideos = embeddableVideos.filter((video) => !existingIds.has(video.id));

            room.videoQueue = [...room.videoQueue, ...newVideos];

            if (!room.playingNow && room.videoQueue.length > 0) {
                room.playingNow = room.videoQueue.shift()!;
                room.isPlaying = true;
                room.currentTime = 0;
                lastPlaybackBroadcastByRoom.delete(roomId);
            }
        });

        broadcastRoomState(roomId, room);
    }

    async function handleMessage(ws: ElysiaWS, message: ClientMessage): Promise<void> {
        if (message.requiresAck && message.id) {
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
                await joinRoom(ws, message.roomId, message.password, true);
                break;
            case 'leaveRoom':
                await leaveRoom(ws);
                break;
            case 'closeRoom':
                await handleCloseRoom(ws);
                break;
            case 'sendMessage': {
                const roomId = await validateClientInRoom(ws);
                publishToRoom(roomId, {
                    type: 'message',
                    sender: ws.id,
                    content: message.message,
                });
                break;
            }
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
    }

    return {
        closeRoom,
        handleMessage,
        leaveCurrentRoom,
    };
}

export type RoomService = ReturnType<typeof createRoomService>;
