import type Redis from 'ioredis';
import type { YouTubeVideo } from '@vkara/youtube';

import { mgetEmbeddability, setEmbeddabilityMany } from './embed-playability-cache';
import { fetchEmbeddableFromYoutube } from './embeddable';
import { type EmbedEnvValues, isEmbedPrefilterAtListEnabled } from '@vkara/env/embed';

import { env } from '@/env';
import { createInFlightDedup } from './in-flight-dedup';
import { mapWithConcurrency } from './map-with-concurrency';

const EMBED_CHECK_CONCURRENCY = 6;

const embedResolveInFlight = createInFlightDedup<string, boolean>();

async function fetchMissedEmbeddability(
    redisClient: Redis,
    videoId: string,
): Promise<boolean> {
    return embedResolveInFlight.run(videoId, async () => {
        const recheck = await mgetEmbeddability(redisClient, [videoId]);
        const cached = recheck.get(videoId);
        if (cached !== undefined) {
            return cached;
        }

        return fetchEmbeddableFromYoutube(videoId);
    });
}

/** Batch resolve embed playability: Redis MGET, then YouTube embed fetch for misses. */
export async function resolveEmbeddabilityMany(
    redisClient: Redis,
    videoIds: string[],
): Promise<Map<string, boolean>> {
    const uniqueIds = [...new Set(videoIds)];
    const result = new Map<string, boolean>();

    if (uniqueIds.length === 0) {
        return result;
    }

    const cached = await mgetEmbeddability(redisClient, uniqueIds);
    const misses: string[] = [];

    for (const id of uniqueIds) {
        const hit = cached.get(id);
        if (hit === undefined) {
            misses.push(id);
        } else {
            result.set(id, hit);
        }
    }

    if (misses.length > 0) {
        const resolved = await mapWithConcurrency(misses, EMBED_CHECK_CONCURRENCY, (videoId) =>
            fetchMissedEmbeddability(redisClient, videoId),
        );

        const toCache: { videoId: string; canEmbed: boolean }[] = [];
        misses.forEach((videoId, index) => {
            const canEmbed = resolved[index] ?? false;
            result.set(videoId, canEmbed);
            toCache.push({ videoId, canEmbed });
        });

        await setEmbeddabilityMany(redisClient, toCache);
    }

    return result;
}

export async function checkEmbeddable(redisClient: Redis, videoId: string): Promise<boolean> {
    const resolved = await resolveEmbeddabilityMany(redisClient, [videoId]);
    return resolved.get(videoId) ?? false;
}

export async function checkEmbeddableMany(
    redisClient: Redis,
    videoIds: string[],
): Promise<{ videoId: string; canEmbed: boolean }[]> {
    const resolved = await resolveEmbeddabilityMany(redisClient, videoIds);
    return videoIds.map((videoId) => ({
        videoId,
        canEmbed: resolved.get(videoId) ?? false,
    }));
}

export async function filterYouTubeVideosByEmbeddability(
    redisClient: Redis,
    videos: YouTubeVideo[],
): Promise<YouTubeVideo[]> {
    if (videos.length === 0) {
        return [];
    }

    const resolved = await resolveEmbeddabilityMany(
        redisClient,
        videos.map((video) => video.id),
    );

    return videos.filter((video) => resolved.get(video.id) === true);
}

export async function filterVideosForListPrefilter(
    redisClient: Redis,
    videos: YouTubeVideo[],
    embed: EmbedEnvValues = env,
): Promise<YouTubeVideo[]> {
    if (!isEmbedPrefilterAtListEnabled(embed)) {
        return videos;
    }

    return filterYouTubeVideosByEmbeddability(redisClient, videos);
}
