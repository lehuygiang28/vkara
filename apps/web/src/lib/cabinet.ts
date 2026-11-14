import type { YouTubeVideo } from '@vkara/youtube';
import { youtubeVideoSchema } from '@vkara/validators/youtube/video';

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
        const parsed = video ? youtubeVideoSchema.safeParse(video) : null;
        if (!parsed?.success || videos.some((existing) => existing.id === parsed.data.id)) {
            continue;
        }
        videos.push(parsed.data);
        if (videos.length >= CABINET_VIDEO_LIMIT) {
            break;
        }
    }
    return videos;
}
