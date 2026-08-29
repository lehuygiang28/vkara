import { isTikTokVideo } from '@vkara/tiktok';
import type { YouTubeVideo } from '@vkara/youtube';
import { ErrorCode, RoomError, type Room } from '@vkara/room';

import { publishToRoom } from '@/modules/room/room-broadcast';
import {
    advanceInFlightByRoom,
    lastPlaybackBroadcastByRoom,
    markCaptionTracksPending,
    resetTikTokPhotoIndex,
} from '@/modules/room/room-playback-state';
import { resolveNextEmbeddableFromQueue } from '@/modules/youtube/resolve-embeddable-queue';
import { checkEmbeddable } from '@/modules/youtube/resolve-embed-playability';
import { mergeQueueAfterAdvance } from '@/modules/room/merge-queue-after-advance';
import { redis } from '@/redis';
import { isVideoAlreadyInRoom, mutateRoom, requireRoom } from '@/utils/room-store';
import { cleanUpRoomField } from '@/utils/common';
import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('RoomCommands');

function broadcastRoomState(roomId: string, room: Room): void {
    publishToRoom(roomId, { type: 'roomUpdate', room: cleanUpRoomField(room) });
}

export async function addVideoToRoom(roomId: string, video: YouTubeVideo): Promise<Room> {
    if (!video?.id) {
        throw new RoomError(ErrorCode.INVALID_MESSAGE, 'Invalid video data');
    }

    try {
        if (!isTikTokVideo(video) && !(await checkEmbeddable(redis, video.id))) {
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
                resetTikTokPhotoIndex(room);
                markCaptionTracksPending(room, video.id);
                lastPlaybackBroadcastByRoom.delete(roomId);
            } else {
                room.videoQueue = [...room.videoQueue, video];
            }
        });

        broadcastRoomState(roomId, room);
        return room;
    } catch (error) {
        if (error instanceof RoomError) throw error;
        logger.error('Failed to add video', { videoId: video.id, error });
        throw new RoomError(ErrorCode.INTERNAL_ERROR, 'Failed to add video');
    }
}

export async function playVideoNowInRoom(roomId: string, video: YouTubeVideo): Promise<Room> {
    if (!isTikTokVideo(video) && !(await checkEmbeddable(redis, video.id))) {
        throw new RoomError(ErrorCode.VIDEO_NOT_EMBEDDABLE, 'Video is not embeddable');
    }

    let restartedSameVideo = false;
    const room = await mutateRoom(roomId, (room) => {
        if (room.playingNow?.id === video.id) {
            restartedSameVideo = true;
            room.isPlaying = true;
            room.currentTime = 0;
            resetTikTokPhotoIndex(room);
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
        resetTikTokPhotoIndex(room);
        markCaptionTracksPending(room, video.id);
        lastPlaybackBroadcastByRoom.delete(roomId);
    });

    broadcastRoomState(roomId, room);
    if (restartedSameVideo) {
        publishToRoom(roomId, { type: 'replay' });
    }
    return room;
}

export async function nextVideoInRoom(
    roomId: string,
    options: { archiveCurrent?: boolean } = {},
): Promise<Room | null> {
    const inFlight = advanceInFlightByRoom.get(roomId);
    if (inFlight) {
        await inFlight;
        return loadAfterAdvance(roomId);
    }

    const archiveCurrent = options.archiveCurrent ?? true;
    const advancePromise = (async () => {
        const snapshot = await requireRoom(roomId);

        if (!snapshot.playingNow && snapshot.videoQueue.length === 0) {
            return;
        }

        const snapshotQueue = snapshot.videoQueue;
        const { video: nextPlayable, remainingQueue } = await resolveNextEmbeddableFromQueue(
            redis,
            snapshotQueue,
        );

        const room = await mutateRoom(roomId, (room) => {
            if (archiveCurrent && room.playingNow?.id) {
                room.historyQueue = [
                    room.playingNow,
                    ...room.historyQueue.filter((v) => v.id !== room.playingNow!.id),
                ];
            }

            room.videoQueue = mergeQueueAfterAdvance(snapshotQueue, remainingQueue, room.videoQueue);

            if (nextPlayable) {
                room.playingNow = nextPlayable;
                room.isPlaying = true;
                room.currentTime = 0;
                resetTikTokPhotoIndex(room);
                markCaptionTracksPending(room, nextPlayable.id);
            } else {
                room.playingNow = null;
                room.isPlaying = false;
                room.currentTime = 0;
                resetTikTokPhotoIndex(room);
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

    return loadAfterAdvance(roomId);
}

async function loadAfterAdvance(roomId: string): Promise<Room | null> {
    try {
        return await requireRoom(roomId);
    } catch {
        return null;
    }
}

