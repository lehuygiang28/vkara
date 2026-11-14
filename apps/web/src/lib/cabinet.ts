import type { YouTubeVideo } from '@vkara/youtube';

import { normalizePersistedYouTubeVideo } from '@/lib/persisted-storage';

export const CABINET_VIDEO_LIMIT = 200;

export function toggleCabinetVideo(videos: YouTubeVideo[], video: YouTubeVideo): YouTubeVideo[] {
    if (videos.some((item) => item.id === video.id)) {
        return videos.filter((item) => item.id !== video.id);
    }

    return [video, ...videos].slice(0, CABINET_VIDEO_LIMIT);
}

export function parseCabinetVideos(raw: unknown): YouTubeVideo[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const videos: YouTubeVideo[] = [];
    for (const item of raw) {
        const video = normalizePersistedYouTubeVideo(item);
        if (!video || videos.some((existing) => existing.id === video.id)) {
            continue;
        }
        videos.push(video);
        if (videos.length >= CABINET_VIDEO_LIMIT) {
            break;
        }
    }
    return videos;
}
