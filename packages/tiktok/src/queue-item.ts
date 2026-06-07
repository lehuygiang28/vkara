import { resolveYoutubeLiveFlag, type YouTubeVideo } from '@vkara/youtube';

import { isTikTokVideo, isTikTokVideoLive } from './video';

export type QueueLiveCheckInput = Pick<
    YouTubeVideo,
    'isLive' | 'duration' | 'uploadedAt' | 'source' | 'url'
>;

/** True for active livestreams (explicit TikTok flag or YouTube heuristics). */
export function isVideoLive({ video }: { video: QueueLiveCheckInput }): boolean {
    if (isTikTokVideo(video)) {
        return isTikTokVideoLive({ video });
    }

    return resolveYoutubeLiveFlag({
        isLive: video.isLive,
        duration: video.duration,
        uploadedAt: video.uploadedAt,
    });
}
