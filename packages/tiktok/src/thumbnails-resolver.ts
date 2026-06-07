import {
    getYouTubeThumbnailSrcSet,
    getYouTubeThumbnailUrl,
    type YouTubeVideo,
} from '@vkara/youtube';

import { getTikTokThumbnailUrl, isTikTokThumbnailVideo } from './thumbnails';

export type VideoThumbnailInput = Pick<YouTubeVideo, 'id' | 'thumbnails' | 'source' | 'url'>;

/** Provider-aware thumbnail URL for queue, now playing, and search lists. */
export function getVideoThumbnailUrl({
    video,
    size,
}: {
    video: VideoThumbnailInput;
    size: 'list' | 'large';
}): string {
    if (isTikTokThumbnailVideo(video)) {
        const tiktokUrl = getTikTokThumbnailUrl({ video });
        if (tiktokUrl) {
            return tiktokUrl;
        }
    }

    return getYouTubeThumbnailUrl(video.thumbnails, size, video.id);
}

export function getVideoThumbnailSrcSet({
    video,
}: {
    video: VideoThumbnailInput;
}): string | undefined {
    if (isTikTokThumbnailVideo(video)) {
        return undefined;
    }

    return getYouTubeThumbnailSrcSet(video.thumbnails, video.id);
}
