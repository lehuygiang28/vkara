import type { YouTubeThumbnailVariant } from '@vkara/youtube';

import type { TikTokImagePost, TikTokSearchItem } from './types';

type TikTokVideoPayload = {
    cover?: string;
    dynamicCover?: string;
    originCover?: string;
    zoomCover?: Record<string, string>;
};

function pushUrl(urls: string[], value: unknown): void {
    if (typeof value !== 'string' || !value.startsWith('http')) {
        return;
    }
    if (!urls.includes(value)) {
        urls.push(value);
    }
}

function pushUrlList(urls: string[], list: unknown): void {
    if (!Array.isArray(list)) {
        return;
    }
    for (const url of list) {
        pushUrl(urls, url);
    }
}

function pushImagePostUrls(urls: string[], imagePost?: TikTokImagePost | null): void {
    if (!imagePost) {
        return;
    }

    for (const image of imagePost.images ?? []) {
        pushUrlList(urls, image.imageURL?.urlList);
    }

    pushUrlList(urls, imagePost.cover?.imageURL?.urlList);
    pushUrlList(urls, imagePost.shareCover?.imageURL?.urlList);
}

/** Collect every cover URL TikTok search may return for one item's video block. */
export function collectTikTokCoverUrls(video?: TikTokVideoPayload | null): string[] {
    if (!video) {
        return [];
    }

    const urls: string[] = [];
    pushUrl(urls, video.cover);
    pushUrl(urls, video.dynamicCover);
    pushUrl(urls, video.originCover);

    if (video.zoomCover && typeof video.zoomCover === 'object') {
        for (const url of Object.values(video.zoomCover)) {
            pushUrl(urls, url);
        }
    }

    return urls;
}

/** Collect cover URLs from video, image posts, live room art, and author avatars. */
export function collectTikTokItemCoverUrls(item: TikTokSearchItem): string[] {
    const urls = collectTikTokCoverUrls(item.video);
    pushImagePostUrls(urls, item.imagePost);
    pushUrl(urls, item.liveRoomInfo?.cover);

    const author = item.author;
    if (author) {
        pushUrl(urls, author.avatarLarger);
        pushUrl(urls, author.avatarMedium);
        pushUrl(urls, author.avatarThumb);
    }

    return urls;
}

export function buildTikTokThumbnailVariants(urls: string[]): YouTubeThumbnailVariant[] {
    return urls.map((url) => {
        const zoom = url.match(/zoomcover:(\d+):(\d+)/i);
        if (zoom) {
            const size = Number(zoom[1]);
            return { url, width: size, height: Number(zoom[2]) || size };
        }

        return { url, width: 540, height: 960 };
    });
}
