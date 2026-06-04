import type Redis from 'ioredis';

import { createRedisBoolCache } from '@vkara/cache-redis';
import { getEmbedCacheTtlSeconds } from '@vkara/env/embed';

export const EMBED_CACHE_PREFIX = 'youtube-embed:';

const embedBoolCache = createRedisBoolCache();

export function getEmbedCacheKey(videoId: string): string {
    return `${EMBED_CACHE_PREFIX}${videoId}`;
}

export type EmbeddabilityCacheLookup = boolean | undefined;

export async function mgetEmbeddability(
    redisClient: Redis,
    videoIds: string[],
): Promise<Map<string, EmbeddabilityCacheLookup>> {
    const uniqueIds = [...new Set(videoIds)];
    const result = new Map<string, EmbeddabilityCacheLookup>();

    if (uniqueIds.length === 0) {
        return result;
    }

    const keys = uniqueIds.map(getEmbedCacheKey);
    const byKey = await embedBoolCache.mget(redisClient, keys);

    for (const id of uniqueIds) {
        result.set(id, byKey.get(getEmbedCacheKey(id)));
    }

    return result;
}

export async function setEmbeddabilityMany(
    redisClient: Redis,
    entries: { videoId: string; canEmbed: boolean }[],
): Promise<void> {
    if (entries.length === 0) {
        return;
    }

    await embedBoolCache.setMany(
        redisClient,
        entries.map(({ videoId, canEmbed }) => ({
            key: getEmbedCacheKey(videoId),
            value: canEmbed,
        })),
        getEmbedCacheTtlSeconds(),
    );
}
