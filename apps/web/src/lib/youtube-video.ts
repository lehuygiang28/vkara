import { resolveYoutubeLiveFlag } from '@vkara/shared-utils';

import type { YouTubeVideo } from '@/types/youtube.type';

/** True for active livestreams (API flag or legacy duration/upload heuristics). */
export function isVideoLive(video: Pick<YouTubeVideo, 'isLive' | 'duration' | 'uploadedAt'>): boolean {
    return resolveYoutubeLiveFlag({
        isLive: video.isLive,
        duration: video.duration,
        uploadedAt: video.uploadedAt,
    });
}
