import type { Room, TvRoomRestoreState } from '@vkara/shared-types';

const MAX_RESTORE_QUEUE_LENGTH = 200;

export function clampRestoreState(restore: TvRoomRestoreState): TvRoomRestoreState {
    return {
        videoQueue: restore.videoQueue.slice(0, MAX_RESTORE_QUEUE_LENGTH),
        playingNow: restore.playingNow,
        isPlaying: restore.isPlaying,
        currentTime: Math.max(0, restore.currentTime),
        volume: Math.min(100, Math.max(0, restore.volume)),
        showQRInPlayer: restore.showQRInPlayer,
    };
}

export function applyTvRestoreToRoom(room: Room, restore: TvRoomRestoreState): void {
    const clamped = clampRestoreState(restore);
    room.videoQueue = clamped.videoQueue;
    room.historyQueue = [];
    room.playingNow = clamped.playingNow;
    room.isPlaying = clamped.isPlaying;
    room.currentTime = clamped.currentTime;
    room.volume = clamped.volume;
    room.showQRInPlayer = clamped.showQRInPlayer;
}
