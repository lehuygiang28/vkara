import type { ElysiaWS } from 'elysia/ws';

import {
    cleanUpRoomField,
    generateRandomNumber,
    shuffleArray,
} from '@/utils/common';
import { roomLogger, createContextLogger } from '@/utils/logger';
import {
    DEFAULT_CAPTION_LANGUAGE,
    ErrorCode,
    RoomError,
    shouldBroadcastPlaybackTime,
    type CaptionTrack,
    acceptSyncPlaybackPositionTime,
    type PlaybackTimeSyncState,
    type ClientInfo,
    type ClientMessage,
    type Room,
    type ServerMessage,
    type TvRoomRestoreState,
    type YouTubeVideo,
} from '@vkara/shared-types';
import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/shared-utils';
import { applyTvRestoreToRoom } from '@/modules/room/apply-tv-restore';
import { publishToRoom } from '@/modules/room/room-broadcast';
import { checkEmbeddable } from '@/modules/youtube/embeddable';
import { fetchYoutubePlaylistVideos } from '@/modules/youtube/fetch-playlist-videos';
import {
    filterEmbeddableVideos,
    resolveNextEmbeddableFromQueue,
} from '@/modules/youtube/resolve-embeddable-queue';
import { mergeQueueAfterAdvance } from '@/modules/room/merge-queue-after-advance';
import { redis } from '@/redis';
import {
    isVideoAlreadyInRoom,
    mutateRoom,
    requireRoom,
    writeRoom,
} from '@/utils/room-store';

const serviceLogger = createContextLogger('RoomService');

const MAX_CAPTION_TRACKS = 64;

function markCaptionTracksPending(room: Room, videoId: string | null): void {
    room.captionTracks = [];
    room.captionTracksVideoId = videoId;
}

function clampCaptionTracks(tracks: CaptionTrack[]): CaptionTrack[] {
    return tracks.slice(0, MAX_CAPTION_TRACKS).map((track) => ({
        languageCode: track.languageCode.slice(0, 16),
        displayName: track.displayName.slice(0, 120),
        kind: track.kind?.slice(0, 16),
    }));
}

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

/** Coalesces concurrent advance/skip requests per room. */
const advanceInFlightByRoom = new Map<string, Promise<void>>();

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

    async function generateAvailableRoomId(): Promise<string> {
        let roomId: string;
        let roomExists: boolean;

        do {
            roomId = generateRandomNumber({ digits: ROOM_ID_LENGTH }).toString();
            roomExists = await roomIdExists(roomId);
        } while (roomExists);

        return roomId;
    }

    async function resolveCreateRoomId(
        preferredRoomId?: string,
        restore?: TvRoomRestoreState,
    ): Promise<string> {
        if (
            restore &&
            preferredRoomId &&
            isValidRoomId(preferredRoomId) &&
            !(await roomIdExists(preferredRoomId))
        ) {
            return preferredRoomId;
        }

        if (restore && preferredRoomId && (await roomIdExists(preferredRoomId))) {
            roomLogger.debug('Preferred room id taken during TV recovery, using random id', {
                preferredRoomId,
            });
        }

        return generateAvailableRoomId();
    }

    async function createRoom(
        ws: ElysiaWS,
        password?: string,
        preferredRoomId?: string,
        restore?: TvRoomRestoreState,
    ) {
        const roomId = await resolveCreateRoomId(
            restore ? preferredRoomId : undefined,
            restore,
        );

        roomLogger.info(`Creating new room`, {
            roomId,
            creatorId: ws.id,
            tvRecovery: Boolean(restore),
            preferredRoomId: restore ? preferredRoomId : undefined,
        });

        const room: Room = {
            id: roomId,
            password: normalizeRoomPassword(password),
            clients: [ws.id],
            videoQueue: [],
            historyQueue: [],
            volume: 100,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: DEFAULT_CAPTION_LANGUAGE,
            captionTracks: [],
            captionTracksVideoId: null,
            playingNow: null,
            lastActivity: Date.now(),
            creatorId: ws.id,
            isPlaying: false,
            currentTime: 0,
        };

        if (restore) {
            applyTvRestoreToRoom(room, restore);
        }

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
                    markCaptionTracksPending(room, video.id);
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

    async function restartPlayingNow(ws: ElysiaWS): Promise<void> {
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

    async function playVideoNow(ws: ElysiaWS, video: YouTubeVideo) {
        const roomId = await validateClientInRoom(ws);

        if (!(await checkEmbeddable(video.id))) {
            throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
        }

        let restartedSameVideo = false;
        const room = await mutateRoom(roomId, (room) => {
            if (room.playingNow?.id === video.id) {
                restartedSameVideo = true;
                room.isPlaying = true;
                room.currentTime = 0;
                lastPlaybackBroadcastByRoom.delete(roomId);
                return;
            }

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
            markCaptionTracksPending(room, video.id);
            lastPlaybackBroadcastByRoom.delete(roomId);
        });

        broadcastRoomState(roomId, room);
        if (restartedSameVideo) {
            publishToRoom(roomId, { type: 'replay' });
        }
    }

    async function advanceToNextPlayable(
        ws: ElysiaWS,
        options: { archiveCurrent?: boolean } = {},
    ): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const inFlight = advanceInFlightByRoom.get(roomId);
        if (inFlight) {
            return inFlight;
        }

        const advancePromise = (async () => {
            const archiveCurrent = options.archiveCurrent ?? true;
            const snapshot = await requireRoom(roomId);

            if (!snapshot.playingNow && snapshot.videoQueue.length === 0) {
                return;
            }

            const snapshotQueue = snapshot.videoQueue;
            const { video: nextPlayable, remainingQueue } = await resolveNextEmbeddableFromQueue(
                snapshotQueue,
            );

            const room = await mutateRoom(roomId, (room) => {
                if (archiveCurrent && room.playingNow?.id) {
                    room.historyQueue = [
                        room.playingNow,
                        ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                    ];
                }

                room.videoQueue = mergeQueueAfterAdvance(
                    snapshotQueue,
                    remainingQueue,
                    room.videoQueue,
                );

                if (nextPlayable) {
                    room.playingNow = nextPlayable;
                    room.isPlaying = true;
                    room.currentTime = 0;
                    markCaptionTracksPending(room, nextPlayable.id);
                } else {
                    room.playingNow = null;
                    room.isPlaying = false;
                    room.currentTime = 0;
                    markCaptionTracksPending(room, null);
                }

                lastPlaybackBroadcastByRoom.delete(roomId);
            });

            broadcastRoomState(roomId, room);
        })();

        advanceInFlightByRoom.set(roomId, advancePromise);
        try {
            await advancePromise;
        } finally {
            if (advanceInFlightByRoom.get(roomId) === advancePromise) {
                advanceInFlightByRoom.delete(roomId);
            }
        }
    }

    async function nextVideo(ws: ElysiaWS) {
        await advanceToNextPlayable(ws, { archiveCurrent: true });
    }

    async function skipUnplayableVideo(ws: ElysiaWS, videoId: string) {
        const roomId = await validateClientInRoom(ws);
        const snapshot = await requireRoom(roomId);

        if (snapshot.playingNow?.id && videoId && snapshot.playingNow.id !== videoId) {
            return;
        }

        await advanceToNextPlayable(ws, { archiveCurrent: false });

        publishToRoom(roomId, {
            type: 'errorWithCode',
            code: ErrorCode.VIDEO_NOT_EMBEDDABLE,
        });
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

    async function setShowQRInPlayer(ws: ElysiaWS, show: boolean): Promise<void> {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            room.showQRInPlayer = show;
        });

        broadcastRoomState(roomId, room);
    }

    async function setCaptionsEnabled(ws: ElysiaWS, enabled: boolean): Promise<void> {
        const roomId = await validateClientInRoom(ws);

        const room = await mutateRoom(roomId, (room) => {
            room.captionsEnabled = enabled;
        });

        broadcastRoomState(roomId, room);
    }

    async function setCaptionsLanguage(ws: ElysiaWS, languageCode: string): Promise<void> {
        const trimmed = languageCode.trim();
        if (!trimmed) {
            throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captions language');
        }

        const roomId = await validateClientInRoom(ws);
        const room = await mutateRoom(roomId, (room) => {
            room.captionsLanguage = trimmed;
        });

        broadcastRoomState(roomId, room);
    }

    async function syncCaptionTracks(
        ws: ElysiaWS,
        videoId: string,
        tracks: CaptionTrack[],
    ): Promise<void> {
        const roomId = await validateClientInRoom(ws);
        const clamped = clampCaptionTracks(tracks);

        const room = await mutateRoom(roomId, (room) => {
            if (!room.playingNow || room.playingNow.id !== videoId) {
                return;
            }
            room.captionTracks = clamped;
            room.captionTracksVideoId = videoId;
        });

        broadcastRoomState(roomId, room);
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

        await mutateRoom(roomId, (room) => {
            room.currentTime = time;
        });

        lastPlaybackBroadcastByRoom.set(roomId, { at: Date.now(), seconds: time });
        publishToRoom(roomId, { type: 'currentTimeChanged', currentTime: time });
    }

    async function syncPlaybackPosition(ws: ElysiaWS, time: number, force = false) {
        const roomId = await validateClientInRoom(ws);
        let previousTime = 0;
        let acceptedTime: number | null = null;

        await mutateRoom(roomId, (room) => {
            previousTime = room.currentTime;
            acceptedTime = acceptSyncPlaybackPositionTime(room.currentTime, time);
            if (acceptedTime !== null) {
                room.currentTime = acceptedTime;
            }
        });

        if (acceptedTime === null) {
            return;
        }

        const lastBroadcast = lastPlaybackBroadcastByRoom.get(roomId);
        if (
            !force &&
            !shouldBroadcastPlaybackTime(lastBroadcast, acceptedTime, previousTime)
        ) {
            return;
        }

        lastPlaybackBroadcastByRoom.set(roomId, { at: Date.now(), seconds: acceptedTime });
        publishToRoom(roomId, { type: 'currentTimeChanged', currentTime: acceptedTime });
    }

    async function replay(ws: ElysiaWS) {
        await restartPlayingNow(ws);
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
            if (room.playingNow?.id === video.id) {
                return;
            }

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

        let videos: YouTubeVideo[];
        try {
            videos = await fetchYoutubePlaylistVideos(playlistUrlOrId, {
                fetchAll: true,
                limit: 200,
            });
        } catch (error) {
            serviceLogger.error('Import playlist failed', { error, playlistUrlOrId });
            throw new RoomError(
                ErrorCode.INVALID_MESSAGE,
                'Could not load playlist. Check the URL and try again.',
            );
        }

        if (videos.length === 0) {
            throw new RoomError(
                ErrorCode.VIDEO_NOT_FOUND,
                'Playlist is empty or could not be loaded.',
            );
        }

        const embeddableVideos = await filterEmbeddableVideos(videos);

        if (embeddableVideos.length === 0) {
            throw new RoomError(
                ErrorCode.VIDEO_NOT_FOUND,
                'No embeddable videos found in this playlist.',
            );
        }

        const snapshot = await requireRoom(roomId);
        const shouldStartPlayback = !snapshot.playingNow;

        const room = await mutateRoom(roomId, (room) => {
            const existingIds = new Set([
                ...room.videoQueue.map((v) => v.id),
                ...(room.playingNow?.id ? [room.playingNow.id] : []),
            ]);
            const newVideos = embeddableVideos.filter((video) => !existingIds.has(video.id));

            room.videoQueue = [...room.videoQueue, ...newVideos];
        });

        if (shouldStartPlayback && room.videoQueue.length > 0) {
            await advanceToNextPlayable(ws, { archiveCurrent: false });
            return;
        }

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
                await createRoom(
                    ws,
                    message.password,
                    message.preferredRoomId,
                    message.restore,
                );
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
            case 'setShowQRInPlayer':
                if (typeof message.show !== 'boolean') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid showQRInPlayer value');
                }
                await setShowQRInPlayer(ws, message.show);
                break;
            case 'setCaptionsEnabled':
                if (typeof message.enabled !== 'boolean') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captionsEnabled value');
                }
                await setCaptionsEnabled(ws, message.enabled);
                break;
            case 'setCaptionsLanguage':
                if (typeof message.languageCode !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid captions language');
                }
                await setCaptionsLanguage(ws, message.languageCode);
                break;
            case 'syncCaptionTracks':
                if (typeof message.videoId !== 'string' || !Array.isArray(message.tracks)) {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid caption tracks payload');
                }
                await syncCaptionTracks(ws, message.videoId, message.tracks);
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
            case 'syncPlaybackPosition':
                if (typeof message.time !== 'number') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid time value');
                }
                await syncPlaybackPosition(ws, message.time, message.force === true);
                break;
            case 'videoFinished':
                await nextVideo(ws);
                break;
            case 'skipUnplayableVideo':
                if (!message.videoId || typeof message.videoId !== 'string') {
                    throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video ID');
                }
                await skipUnplayableVideo(ws, message.videoId);
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
