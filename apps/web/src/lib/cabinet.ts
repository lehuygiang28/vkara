import type { YouTubeVideo } from '@vkara/youtube';
import { youtubeVideoSchema } from '@vkara/validators/youtube/video';

import { normalizePersistedYouTubeVideo } from '@/lib/persisted-storage';

export const CABINET_VIDEO_LIMIT = 200;

export type CabinetWrite = 'add' | 'remove';

export function applyCabinetWrite(
    videos: YouTubeVideo[],
    video: YouTubeVideo,
    write: CabinetWrite,
): YouTubeVideo[] {
    const has = videos.some((item) => item.id === video.id);
    if (write === 'remove') {
        return has ? videos.filter((item) => item.id !== video.id) : videos;
    }
    if (has) {
        return videos;
    }
    return [video, ...videos].slice(0, CABINET_VIDEO_LIMIT);
}

export function toggleCabinetVideo(videos: YouTubeVideo[], video: YouTubeVideo): YouTubeVideo[] {
    const write: CabinetWrite = videos.some((item) => item.id === video.id) ? 'remove' : 'add';
    return applyCabinetWrite(videos, video, write);
}

export function cabinetSaveEvictedOldest(
    before: readonly YouTubeVideo[],
    after: readonly YouTubeVideo[],
    videoId: string,
): boolean {
    if (before.length < CABINET_VIDEO_LIMIT || before.some((item) => item.id === videoId)) {
        return false;
    }
    const oldest = before[before.length - 1];
    return Boolean(oldest && after[0]?.id === videoId && !after.some((item) => item.id === oldest.id));
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
