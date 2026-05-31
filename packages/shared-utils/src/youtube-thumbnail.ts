import type { YouTubeThumbnailVariant } from "@vkara/shared-types";

/** Known YouTube static thumbnail slots on i.ytimg.com. */
export const YOUTUBE_THUMBNAIL_SLOTS = [
  { key: "default", width: 120, height: 90 },
  { key: "mqdefault", width: 320, height: 180 },
  { key: "hqdefault", width: 480, height: 360 },
  { key: "sddefault", width: 640, height: 480 },
  { key: "maxresdefault", width: 1280, height: 720 },
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

    const leftSigned = left.url.includes("?") ? 1 : 0;
    const rightSigned = right.url.includes("?") ? 1 : 0;
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
    width: Math.max(canonical.width ?? 0, current?.width ?? 0, incoming.width ?? 0) || undefined,
    height:
      Math.max(canonical.height ?? 0, current?.height ?? 0, incoming.height ?? 0) || undefined,
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

export function getYouTubeThumbnailUrl(
  thumbnails: YouTubeThumbnailVariant[] | undefined,
  size: "list" | "large",
  videoId: string,
): string {
  const variants = normalizeVideoThumbnails(thumbnails, videoId);

  if (size === "large") {
    return variants[variants.length - 1]!.url;
  }

  return variants[0]!.url;
}

/** Build an HTML srcSet string from normalized thumbnail variants. */
export function getYouTubeThumbnailSrcSet(
  thumbnails: YouTubeThumbnailVariant[] | undefined,
  videoId: string,
): string | undefined {
  const variants = normalizeVideoThumbnails(thumbnails, videoId);
  const withWidth = variants.filter((variant) => variant.width && variant.width > 0);

  if (withWidth.length === 0) {
    return undefined;
  }

  return withWidth.map((variant) => `${variant.url} ${variant.width}w`).join(", ");
}
