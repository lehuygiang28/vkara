import { isTikTokPhotoPost } from '@vkara/tiktok';
import type { YouTubeVideo } from '@vkara/youtube';

import { isTikTokPlayback } from '@/lib/active-playback';

/** Minimal room slice the TikTok host hooks subscribe to. */
export type TikTokHostRoomSlice = {
    room: {
        id: string;
        playingNow?: YouTubeVideo | null;
        isPlaying?: boolean;
    } | null;
};

/**
 * Primitive selector — must stay Object.is-stable.
 * Returning `{ playingNowId, roomIsPlaying }` here causes React error #185
 * (zustand notifies on every snapshot because a new object fails Object.is).
 */
export function selectTikTokHostPlayingNowId(state: TikTokHostRoomSlice): string | null {
    const playingNow = state.room?.playingNow;
    if (!state.room?.id || !playingNow || !isTikTokPlayback({ video: playingNow })) {
        return null;
    }
    return playingNow.id;
}

export function selectTikTokHostIsPlaying(state: TikTokHostRoomSlice): boolean {
    const playingNow = state.room?.playingNow;
    if (!state.room?.id || !playingNow || !isTikTokPlayback({ video: playingNow })) {
        return false;
    }
    return state.room.isPlaying ?? false;
}

export function selectTikTokPhotoSyncPlayingNowId(state: TikTokHostRoomSlice): string | null {
    const playingNow = state.room?.playingNow;
    if (!state.room?.id || !playingNow || !isTikTokPhotoPost({ video: playingNow })) {
        return null;
    }
    return playingNow.id;
}
