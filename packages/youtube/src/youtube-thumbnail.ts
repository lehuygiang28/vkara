import type { YouTubeThumbnailVariant } from './youtube';

/** Known YouTube static thumbnail slots on i.ytimg.com. */
export const YOUTUBE_THUMBNAIL_SLOTS = [
    { key: 'default', width: 120, height: 90 },
    { key: 'mqdefault', width: 320, height: 180 },
    { key: 'hqdefault', width: 480, height: 360 },
    { key: 'sddefault', width: 640, height: 480 },
    { key: 'maxresdefault', width: 1280, height: 720 },
] as const;

export function youtubeThumbnailSlot(url: string): string {
    const match = url.match(/\/vi\/[^/]+\/([^.?/]+)/);
    return match?.[1] ?? `url:${url}`;
}

export function youtubeCanonicalThumbnailUrl(videoId: string, key: string): string {
    return `https://i.ytimg.com/vi/${videoId}/${key}.jpg`;
}

function thumbnailArea(thumbnail: YouTubeThumbnailVariant): number {
    return (thumbnail.width ?? 0) * (thumbnail.height ?? 0);
}

function sortThumbnailVariants(variants: YouTubeThumbnailVariant[]): YouTubeThumbnailVariant[] {
    return [...variants].sort((left, right) => {
        const areaDiff = thumbnailArea(left) - thumbnailArea(right);
        if (areaDiff !== 0) {
            return areaDiff;
        }

        const leftSigned = left.url.includes('?') ? 1 : 0;
        const rightSigned = right.url.includes('?') ? 1 : 0;
        if (leftSigned !== rightSigned) {
            return leftSigned - rightSigned;
        }

        return left.url.localeCompare(right.url);
    });
}

function slotDimensions(slot: string): { width?: number; height?: number } {
    const canonical = YOUTUBE_THUMBNAIL_SLOTS.find((entry) => entry.key === slot);
    return canonical ? { width: canonical.width, height: canonical.height } : {};
}

function mergeSlotVariant(
    slot: string,
    current: YouTubeThumbnailVariant | undefined,
    incoming: YouTubeThumbnailVariant,
): YouTubeThumbnailVariant {
    const canonical = slotDimensions(slot);

    return {
        url: incoming.url,
        width:
            Math.max(canonical.width ?? 0, current?.width ?? 0, incoming.width ?? 0) || undefined,
        height:
            Math.max(canonical.height ?? 0, current?.height ?? 0, incoming.height ?? 0) ||
            undefined,
    };
}

/** Merge youtubei thumbnails with canonical i.ytimg.com sizes for a video id. */
export function buildYouTubeThumbnails(
    videoId: string,
    youtubeiVariants: YouTubeThumbnailVariant[] = [],
): YouTubeThumbnailVariant[] {
    const bySlot = new Map<string, YouTubeThumbnailVariant>();

    for (const slot of YOUTUBE_THUMBNAIL_SLOTS) {
        bySlot.set(slot.key, {
            url: youtubeCanonicalThumbnailUrl(videoId, slot.key),
            width: slot.width,
            height: slot.height,
        });
    }

    for (const variant of youtubeiVariants) {
        if (!variant.url) {
            continue;
        }

        const slot = youtubeThumbnailSlot(variant.url);
        bySlot.set(slot, mergeSlotVariant(slot, bySlot.get(slot), variant));
    }

    return sortThumbnailVariants([...bySlot.values()]);
}

export function normalizeVideoThumbnails(
    thumbnails: YouTubeThumbnailVariant[] | undefined,
    videoId: string,
): YouTubeThumbnailVariant[] {
    return buildYouTubeThumbnails(videoId, thumbnails ?? []);
}

const LARGE_THUMBNAIL_FALLBACK_SLOTS = [
    'maxresdefault',
    'sddefault',
    'hqdefault',
    'mqdefault',
    'default',
] as const;

const LIST_THUMBNAIL_FALLBACK_SLOTS = ['mqdefault', 'hqdefault', 'sddefault', 'default'] as const;

/** YouTube serves this width for missing slots (404 body is still a valid JPEG). */
export const YOUTUBE_THUMBNAIL_PLACEHOLDER_MAX_WIDTH = 120;

function hasHighResThumbnail(thumbnails: YouTubeThumbnailVariant[] | undefined): boolean {
    return (thumbnails ?? []).some((variant) => {
        const slot = youtubeThumbnailSlot(variant.url);
        return slot === 'maxresdefault' || slot === 'hq720' || (variant.width ?? 0) >= 1280;
    });
}

function largestKnownThumbnailUrl(
    thumbnails: YouTubeThumbnailVariant[] | undefined,
): string | undefined {
    const youtubeiVariants = (thumbnails ?? []).filter((variant) => variant.url);
    if (youtubeiVariants.length === 0) {
        return undefined;
    }

    return sortThumbnailVariants(youtubeiVariants).at(-1)?.url;
}

/** True when YouTube returned its grey 120×90 “missing slot” JPEG (404 with valid body). */
export function isYouTubeThumbnailPlaceholder(naturalWidth: number, currentUrl: string): boolean {
    if (youtubeThumbnailSlot(currentUrl) === 'default') {
        return false;
    }

    return naturalWidth > 0 && naturalWidth <= YOUTUBE_THUMBNAIL_PLACEHOLDER_MAX_WIDTH;
}

/** Ordered i.ytimg.com slots to try when a preferred thumbnail URL fails to load. */
export function getYouTubeThumbnailFallbackChain(
    videoId: string,
    size: 'list' | 'large',
): string[] {
    const slots = size === 'large' ? LARGE_THUMBNAIL_FALLBACK_SLOTS : LIST_THUMBNAIL_FALLBACK_SLOTS;
    return slots.map((key) => youtubeCanonicalThumbnailUrl(videoId, key));
}

/** Next lower-resolution thumbnail URL after `currentUrl` fails (404 / broken image). */
export function getNextYouTubeThumbnailFallback(
    currentUrl: string,
    videoId: string,
    size: 'list' | 'large',
): string | undefined {
    const slots = size === 'large' ? LARGE_THUMBNAIL_FALLBACK_SLOTS : LIST_THUMBNAIL_FALLBACK_SLOTS;
    const currentSlot = youtubeThumbnailSlot(currentUrl);
    const currentIndex = slots.findIndex((slot) => slot === currentSlot);
    const startIndex = currentIndex === -1 ? 0 : currentIndex + 1;

    for (let index = startIndex; index < slots.length; index += 1) {
        const url = youtubeCanonicalThumbnailUrl(videoId, slots[index]!);
        if (url !== currentUrl) {
            return url;
        }
    }

    return undefined;
}

export function getYouTubeThumbnailUrl(
    thumbnails: YouTubeThumbnailVariant[] | undefined,
    size: 'list' | 'large',
    videoId: string,
): string {
    const variants = normalizeVideoThumbnails(thumbnails, videoId);

    if (size === 'large') {
        if (hasHighResThumbnail(thumbnails)) {
            return variants[variants.length - 1]!.url;
        }

        const known = largestKnownThumbnailUrl(thumbnails);
        if (known) {
            return known;
        }

        return youtubeCanonicalThumbnailUrl(videoId, 'sddefault');
    }

    const listVariant =
        variants.find((variant) => youtubeThumbnailSlot(variant.url) === 'mqdefault') ??
        variants.find((variant) => {
            const width = variant.width ?? 0;
            const height = variant.height ?? 0;
            return width > 0 && height > 0 && width / height >= 1.7;
        });

    return listVariant?.url ?? variants[0]!.url;
}

/** Build an HTML srcSet string from normalized thumbnail variants. */
export function getYouTubeThumbnailSrcSet(
    thumbnails: YouTubeThumbnailVariant[] | undefined,
    videoId: string,
): string | undefined {
    const variants = normalizeVideoThumbnails(thumbnails, videoId);
    let withWidth = variants.filter((variant) => variant.width && variant.width > 0);

    if (!hasHighResThumbnail(thumbnails)) {
        const maxKnownWidth = Math.max(
            0,
            ...(thumbnails ?? []).map((variant) => variant.width ?? 0),
        );
        if (maxKnownWidth > 0) {
            withWidth = withWidth.filter((variant) => (variant.width ?? 0) <= maxKnownWidth);
        }
    }

    if (withWidth.length === 0) {
        return undefined;
    }

    return withWidth.map((variant) => `${variant.url} ${variant.width}w`).join(', ');
}

export function isYouTubeThumbnailHost(url: string): boolean {
    return /(^|\/\/)(i\.)?ytimg\.com\//.test(url);
}
