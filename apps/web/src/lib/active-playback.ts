import type { YouTubeVideo } from '@vkara/youtube';
import { isTikTokVideo } from '@vkara/tiktok';
import {
    applyRoomPlaybackToTikTok,
    applySeekToTikTok,
    applyTikTokVolume,
    getTikTokPhotoImageIndex,
    getTikTokSeekBaseSeconds,
    isTikTokPlayerReady,
    navigateTikTokPhotoTo,
} from '@/lib/tiktok-playback-sync';
import { isPlayerPageHidden } from '@/lib/tiktok-room-playback';
import {
    applyRoomPlaybackToPlayer,
    applySeekToPlayer,
} from '@/lib/youtube-playback-sync';

export type ActivePlaybackVideo = Pick<YouTubeVideo, 'source' | 'url'> | null | undefined;

export type ActivePlaybackContext = {
    video: ActivePlaybackVideo;
    youtubePlayer: YT.Player | null;
};

export function isTikTokPlayback({ video }: { video: ActivePlaybackVideo }): boolean {
    return Boolean(video && isTikTokVideo(video));
}

/** Apply play/pause to whichever embed is active for `video`. */
export function applyPlaybackIntent({
    video,
    youtubePlayer,
    isPlaying,
}: ActivePlaybackContext & { isPlaying: boolean }): void {
    if (isTikTokPlayback({ video })) {
        if (isPlaying && isPlayerPageHidden()) {
            return;
        }
        applyRoomPlaybackToTikTok(isPlaying);
        return;
    }
    if (youtubePlayer) {
        applyRoomPlaybackToPlayer(youtubePlayer, isPlaying);
    }
}

export function applyPlaybackVolume({
    video,
    youtubePlayer,
    volume,
}: ActivePlaybackContext & { volume: number }): void {
    if (isTikTokPlayback({ video })) {
        applyTikTokVolume(volume);
        return;
    }
    youtubePlayer?.setVolume(volume);
}

export function applyPlaybackSeek({
    video,
    youtubePlayer,
    seconds,
}: ActivePlaybackContext & { seconds: number }): void {
    if (isTikTokPlayback({ video })) {
        applySeekToTikTok(seconds);
        return;
    }
    if (youtubePlayer) {
        applySeekToPlayer(youtubePlayer, seconds);
    }
}

/** Seek base for relative seek and sync; null when the active embed cannot report time yet. */
export function readPlaybackPositionSeconds({
    video,
    youtubePlayer,
    roomIsPlaying,
    roomCurrentTime,
}: ActivePlaybackContext & {
    roomIsPlaying: boolean;
    roomCurrentTime: number;
}): number | null {
    if (isTikTokPlayback({ video })) {
        if (!isTikTokPlayerReady()) {
            return null;
        }
        return getTikTokSeekBaseSeconds(roomIsPlaying);
    }
    if (youtubePlayer) {
        return Math.max(0, Math.floor(youtubePlayer.getCurrentTime()));
    }
    return roomCurrentTime;
}

/** Room join: volume + initial play state for the active provider. */
export function bootstrapActivePlayback({
    video,
    youtubePlayer,
    roomVolume,
    roomIsPlaying,
}: ActivePlaybackContext & {
    roomVolume: number;
    roomIsPlaying: boolean;
}): void {
    applyPlaybackVolume({ video, youtubePlayer, volume: roomVolume });
    if (!video) {
        return;
    }
    if (isTikTokPlayback({ video })) {
        if (isTikTokPlayerReady()) {
            applyPlaybackIntent({ video, youtubePlayer, isPlaying: roomIsPlaying });
        }
        return;
    }
    if (youtubePlayer) {
        applyRoomPlaybackToPlayer(youtubePlayer, roomIsPlaying);
    }
}

/** Sync TikTok photo carousel slide when room broadcasts index changes. */
export function syncTikTokPhotoIndex({
    video,
    index,
}: {
    video: ActivePlaybackVideo;
    index: number;
}): void {
    if (!isTikTokPlayback({ video })) {
        return;
    }
    if (getTikTokPhotoImageIndex() !== index) {
        navigateTikTokPhotoTo(index);
    }
}
