import { formatSeconds, type YouTubeVideo } from '@vkara/youtube';

import { buildTikTokThumbnailVariants } from './cover';
import type { TikTokVideo } from './types';

/**
 * Normalize TikTok `video.duration` to seconds.
 *
 * Search/general API returns seconds (15, 180, 600, 2680 for a 44‑min mixtape).
 * Some aweme payloads use milliseconds for short clips (e.g. 15_000 → 15s).
 */
export function tiktokDurationSeconds(rawDuration: number): number {
    if (rawDuration <= 0) {
        return 0;
    }

    const rounded = Math.round(rawDuration);

    // Milliseconds: typical short clips are 5_000–600_000 ms (5s–10m).
    if (rounded >= 5_000) {
        const fromMs = Math.round(rounded / 1000);
        // Long mixtapes in search are seconds (1_000–7_200+). Do not divide those.
        if (fromMs <= 7_200) {
            return fromMs;
        }
    }

    return rounded;
}

export function toQueueVideo(video: TikTokVideo): YouTubeVideo {
    const durationSec = video.isLive ? 0 : tiktokDurationSeconds(video.duration);
    const durationFormatted =
        video.isLive || video.isImagePost || durationSec <= 0 ? '' : formatSeconds(durationSec);

    return {
        id: video.id,
        title: video.desc || video.url,
        duration: durationSec,
        duration_formatted: durationFormatted,
        type: video.isLive ? 'live' : video.isImagePost ? 'photo' : 'video',
        uploadedAt: '',
        url: video.url,
        views: video.stats.playCount,
        channels: [{ name: video.author.nickname, verified: false }],
        thumbnails: buildTikTokThumbnailVariants(
            video.coverUrls.length > 0 ? video.coverUrls : video.cover ? [video.cover] : [],
        ),
        isLive: video.isLive,
        source: 'tiktok',
        ...(video.isImagePost && video.imageCount > 0
            ? { tiktokImageCount: video.imageCount }
            : {}),
    };
}
