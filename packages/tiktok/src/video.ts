import { getVideoSource, type YouTubeVideo } from '@vkara/youtube';

export type TikTokQueueItem = Pick<YouTubeVideo, 'source' | 'url'>;

export type TikTokPhotoItem = Pick<YouTubeVideo, 'type' | 'source' | 'url' | 'tiktokImageCount'>;

export function isTikTokVideo(video: TikTokQueueItem): boolean {
    if (getVideoSource(video) === 'tiktok') {
        return true;
    }
    return typeof video.url === 'string' && video.url.includes('tiktok.com/');
}

/** Highest zero-based slide index for a TikTok photo post (metadata + room sync). */
export function getTikTokPhotoMaxIndex({
    video,
    roomMaxIndex = 0,
}: {
    video: TikTokPhotoItem | null | undefined;
    roomMaxIndex?: number;
}): number {
    if (!video || video.type !== 'photo' || !isTikTokVideo(video)) {
        return Math.max(0, roomMaxIndex);
    }
    const fromMeta =
        typeof video.tiktokImageCount === 'number' && video.tiktokImageCount > 0
            ? video.tiktokImageCount - 1
            : 0;
    return Math.max(Math.max(0, roomMaxIndex), fromMeta);
}

/** TikTok photo carousel (no API duration; embed uses music timing). */
export function isTikTokPhotoPost({
    video,
}: {
    video: Pick<YouTubeVideo, 'type' | 'source' | 'url'> | null | undefined;
}): boolean {
    return Boolean(video && isTikTokVideo(video) && video.type === 'photo');
}

/** True when TikTok item is an active livestream (explicit flag only). */
export function isTikTokVideoLive({
    video,
}: {
    video: Pick<YouTubeVideo, 'isLive' | 'source' | 'url'>;
}): boolean {
    return isTikTokVideo(video) && video.isLive === true;
}
