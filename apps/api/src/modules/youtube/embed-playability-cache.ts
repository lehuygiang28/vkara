import type Redis from 'ioredis';

import { getEmbedCacheTtlSeconds } from '@/config/embed-playability-env';

export const EMBED_CACHE_PREFIX = 'youtube-embed:';

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

    let values: (string | null)[];
    try {
        const keys = uniqueIds.map(getEmbedCacheKey);
        values = await redisClient.mget(...keys);
    } catch {
        for (const id of uniqueIds) {
            result.set(id, undefined);
        }
        return result;
    }

    uniqueIds.forEach((id, index) => {
        const value = values[index];
        if (value === '1') {
            result.set(id, true);
        } else if (value === '0') {
            result.set(id, false);
        } else {
            result.set(id, undefined);
        }
    });

    return result;
}

export async function setEmbeddabilityMany(
    redisClient: Redis,
    entries: { videoId: string; canEmbed: boolean }[],
): Promise<void> {
    if (entries.length === 0) {
        return;
    }

    const ttlSeconds = getEmbedCacheTtlSeconds();

    try {
        const pipeline = redisClient.pipeline();
        for (const { videoId, canEmbed } of entries) {
            pipeline.setex(getEmbedCacheKey(videoId), ttlSeconds, canEmbed ? '1' : '0');
        }
        await pipeline.exec();
    } catch {
        // Fetch-through remains valid when Redis is unavailable.
    }
}
