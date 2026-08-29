import { getTikTokPhotoMaxIndex } from '@vkara/tiktok';
import type { PlaybackTimeSyncState, Room } from '@vkara/room';

/** Throttles currentTime WS spam per room. */
export const lastPlaybackBroadcastByRoom = new Map<string, PlaybackTimeSyncState>();

/** Coalesces concurrent advance/skip requests per room. */
export const advanceInFlightByRoom = new Map<string, Promise<void>>();

export function markCaptionTracksPending(room: Room, videoId: string | null): void {
    room.captionTracks = [];
    room.captionTracksVideoId = videoId;
}

export function resetTikTokPhotoIndex(room: Room): void {
    room.tiktokPhotoIndex = 0;
    room.tiktokPhotoMaxIndex = getTikTokPhotoMaxIndex({ video: room.playingNow, roomMaxIndex: 0 });
}
