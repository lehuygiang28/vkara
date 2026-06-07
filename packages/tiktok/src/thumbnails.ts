import { getVideoSource, type YouTubeThumbnailVariant, type YouTubeVideo } from '@vkara/youtube';

import { isTikTokVideo } from './video';

export function isTikTokCdnThumbnailUrl(url: string): boolean {
    return /tiktokcdn\.com/i.test(url);
}

function sortThumbnailVariants(variants: YouTubeThumbnailVariant[]): YouTubeThumbnailVariant[] {
    return [...variants].sort((left, right) => {
        const leftArea = (left.width ?? 0) * (left.height ?? 0);
        const rightArea = (right.width ?? 0) * (right.height ?? 0);
        if (leftArea !== rightArea) {
            return leftArea - rightArea;
        }
        return left.url.localeCompare(right.url);
    });
}

export function normalizeTikTokThumbnails(
    thumbnails: YouTubeThumbnailVariant[] | undefined,
): YouTubeThumbnailVariant[] {
    return (thumbnails ?? []).filter(
        (variant) => variant.url && isTikTokCdnThumbnailUrl(variant.url),
    );
}

export function isTikTokThumbnailVideo(
    video: Pick<YouTubeVideo, 'source' | 'url' | 'thumbnails'>,
): boolean {
    if (getVideoSource(video) === 'tiktok') {
        return true;
    }
    if (typeof video.url === 'string' && video.url.includes('tiktok.com/')) {
        return true;
    }
    return (video.thumbnails ?? []).some((variant) => isTikTokCdnThumbnailUrl(variant.url));
}

export function pickTikTokThumbnailUrl({
    thumbnails,
}: {
    thumbnails: YouTubeThumbnailVariant[] | undefined;
}): string {
    const variants = normalizeTikTokThumbnails(thumbnails);
    if (variants.length === 0) {
        return '';
    }

    const origin = variants.find((variant) => /origin\.image/i.test(variant.url));
    if (origin) {
        return origin.url;
    }

    const cover = variants.find(
        (variant) =>
            /photomode|tplv-tiktokx-cropcenter|\/tos-alisg-p-/i.test(variant.url) &&
            !/tplv-tiktokx-cropcenter:100:/i.test(variant.url),
    );
    if (cover) {
        return cover.url;
    }

    const sorted = sortThumbnailVariants(variants);
    return sorted[sorted.length - 1]!.url;
}

export function getTikTokThumbnailUrl({
    video,
}: {
    video: Pick<YouTubeVideo, 'thumbnails' | 'source' | 'url'>;
}): string {
    if (!isTikTokVideo(video)) {
        return '';
    }
    const url = pickTikTokThumbnailUrl({ thumbnails: video.thumbnails });
    return url && isTikTokCdnThumbnailUrl(url) ? url : '';
}
