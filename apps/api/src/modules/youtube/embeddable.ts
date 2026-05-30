import { createInFlightDedup } from './in-flight-dedup';
import { mapWithConcurrency } from './map-with-concurrency';

const CACHE_TTL_MS = 60 * 60 * 1000;
const EMBED_CHECK_CONCURRENCY = 6;

const embeddableCache = new Map<string, { value: boolean; expiresAt: number }>();
const embedCheckInFlight = createInFlightDedup<string, boolean>();

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

const fetchEmbeddable = async (videoId: string): Promise<boolean> => {
    const baseUrls = [
        'https://www.youtube-nocookie.com/embed/',
        'https://www.youtube.com/embed/',
    ];
    const errString = 'Playback on other websites has been disabled by the video own';
    const stringAbility = 'previewPlayabilityStatus';

    const url = `${baseUrls[Math.floor(Math.random() * baseUrls.length)]}${videoId}`;
    const raw = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        },
    });

    if (!raw.ok) {
        setCachedEmbeddable(videoId, false);
        return false;
    }

    const text = await raw.text();
    const isEmbeddable = !text.includes(errString) && text.includes(stringAbility);
    setCachedEmbeddable(videoId, isEmbeddable);
    return isEmbeddable;
};

export const checkEmbeddable = async (videoId: string): Promise<boolean> => {
    const cached = getCachedEmbeddable(videoId);
    if (cached !== undefined) {
        return cached;
    }

    const inFlight = embedCheckInFlight.run(videoId, () => fetchEmbeddable(videoId));
    return inFlight;
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
