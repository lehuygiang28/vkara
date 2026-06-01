import type { YouTubeVideo } from '@vkara/shared-types';

export type RoomQueueSlice = {
    playingNow?: YouTubeVideo | null;
    videoQueue: YouTubeVideo[];
} | null;

/** Mirrors server `isVideoAlreadyInRoom` — cheap client guard before WS round-trip. */
export function isVideoInRoom(room: RoomQueueSlice, videoId: string): boolean {
    if (!room) return false;
    return room.playingNow?.id === videoId || room.videoQueue.some((v) => v.id === videoId);
}

export function isCurrentlyPlaying(room: RoomQueueSlice, videoId: string): boolean {
    return room?.playingNow?.id === videoId;
}
