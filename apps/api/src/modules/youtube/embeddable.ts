import { createInFlightDedup } from './in-flight-dedup';
import { mapWithConcurrency } from './map-with-concurrency';

const CACHE_TTL_MS = 60 * 60 * 1000;
const EMBED_CHECK_CONCURRENCY = 6;

/** Status values YouTube returns when the embed iframe can play. */
const EMBED_PLAYABLE_STATUSES = new Set(['OK', 'LIVE_STREAM']);

/** Owner-disabled and other hard blocks surfaced in embed HTML (EN + VI). */
export const EMBED_BLOCKED_PATTERNS: RegExp[] = [
    /Playback on other websites has been disabled/i,
    /not available to play in embedded players/i,
    /embedding has been disabled/i,
    /Phát trên các trang web khác đã bị tắt/i,
];

export type EmbedPlayabilityPreview = {
    status?: string;
    reason?: string;
};

const EMBED_CHECK_BASE_URLS = [
    'https://www.youtube-nocookie.com/embed/',
    'https://www.youtube.com/embed/',
] as const;

const embeddableCache = new Map<string, { value: boolean; expiresAt: number }>();
const embedCheckInFlight = createInFlightDedup<string, boolean>();
let embedCheckUrlCursor = 0;

/** Spread embed fetches across nocookie + youtube.com to reduce rate-limit pressure. */
function nextEmbedCheckBaseUrl(): string {
    const base = EMBED_CHECK_BASE_URLS[embedCheckUrlCursor % EMBED_CHECK_BASE_URLS.length]!;
    embedCheckUrlCursor = (embedCheckUrlCursor + 1) % EMBED_CHECK_BASE_URLS.length;
    return base;
}

const getCachedEmbeddable = (videoId: string): boolean | undefined => {
    const cached = embeddableCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }
    return undefined;
};

const setCachedEmbeddable = (videoId: string, value: boolean): void => {
    embeddableCache.set(videoId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

/** Origin must match the site that embeds YouTube (see IFrame API `origin` param). */
export function getEmbedCheckOrigin(): string {
    const raw =
        process.env.PUBLIC_APP_URL ||
        process.env.APP_PUBLIC_URL ||
        process.env.WEB_ORIGIN ||
        'http://localhost:3000';

    return raw.replace(/\/$/, '');
}

export function parseEmbedPlayabilityPreview(html: string): EmbedPlayabilityPreview | null {
    const marker = 'previewPlayabilityStatus';
    const idx = html.indexOf(marker);
    if (idx < 0) return null;

    const chunk = html.slice(idx, idx + 2000);
    const status =
        chunk.match(/status\\\":\\\"([A-Z_]+)/)?.[1] ??
        chunk.match(/"status":"([A-Z_]+)"/)?.[1];
    const reason =
        chunk.match(/reason\\\":\\\"([^\\"]+)/)?.[1] ??
        chunk.match(/"reason":"([^"]+)"/)?.[1];

    return { status, reason };
}

export function isEmbedBlockedInHtml(html: string): boolean {
    if (EMBED_BLOCKED_PATTERNS.some((pattern) => pattern.test(html))) {
        return true;
    }

    const preview = parseEmbedPlayabilityPreview(html);
    if (!preview?.status) {
        return true;
    }

    if (EMBED_PLAYABLE_STATUSES.has(preview.status)) {
        return false;
    }

    return preview.status === 'ERROR' || preview.status === 'UNPLAYABLE';
}

const fetchEmbeddable = async (videoId: string): Promise<boolean> => {
    const origin = getEmbedCheckOrigin();
    const url = `${nextEmbedCheckBaseUrl()}${videoId}?origin=${encodeURIComponent(origin)}&enablejsapi=1&playsinline=1`;

    const raw = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
            Referer: `${origin}/`,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        },
    });

    if (!raw.ok) {
        setCachedEmbeddable(videoId, false);
        return false;
    }

    const text = await raw.text();
    const canEmbed = !isEmbedBlockedInHtml(text);
    setCachedEmbeddable(videoId, canEmbed);
    return canEmbed;
};

export const checkEmbeddable = async (videoId: string): Promise<boolean> => {
    const cached = getCachedEmbeddable(videoId);
    if (cached !== undefined) {
        return cached;
    }

    return embedCheckInFlight.run(videoId, () => fetchEmbeddable(videoId));
};

/** Batch embed checks with cache + in-flight dedupe + concurrency cap. */
export const checkEmbeddableMany = async (
    videoIds: string[],
): Promise<{ videoId: string; canEmbed: boolean }[]> => {
    const uniqueIds = [...new Set(videoIds)];

    const results = await mapWithConcurrency(uniqueIds, EMBED_CHECK_CONCURRENCY, async (videoId) => ({
        videoId,
        canEmbed: await checkEmbeddable(videoId),
    }));

    const byId = new Map(results.map((entry) => [entry.videoId, entry.canEmbed]));
    return videoIds.map((videoId) => ({
        videoId,
        canEmbed: byId.get(videoId) ?? false,
    }));
};
