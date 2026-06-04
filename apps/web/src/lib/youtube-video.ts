import { resolveYoutubeLiveFlag } from '@vkara/youtube';

import type { YouTubeVideo } from '@vkara/youtube';

/** True for active livestreams (API flag or legacy duration/upload heuristics). */
export function isVideoLive(video: Pick<YouTubeVideo, 'isLive' | 'duration' | 'uploadedAt'>): boolean {
    return resolveYoutubeLiveFlag({
        isLive: video.isLive,
        duration: video.duration,
        uploadedAt: video.uploadedAt,
    });
}
