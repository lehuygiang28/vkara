import type Redis from 'ioredis';
import type { SearchResult } from 'youtubei';

import { recordMemoryCleanup } from '@/modules/stats/service-stats';
import { createContextLogger } from '@/utils/logger';

const youtubeiLogger = createContextLogger('Queue/Youtubei');

export const REDIS_KEY_PREFIXES = {
    SEARCH: 'search-instance:',
    RELATED: 'related-instance:',
} as const;

export const CLEANUP_TIMEOUT = 5 * 60 * 1000;
export const MAX_INSTANCES_PER_TYPE = 1000;

export interface SearchInstanceWithTimestamp {
    instance: SearchResult<'video'>;
    timestamp: number;
}

export const searchInstances = new Map<string, SearchInstanceWithTimestamp>();
export const relatedInstances = new Map<string, SearchInstanceWithTimestamp>();

export const getRedisKey = (prefix: string, continuation: string): string => `${prefix}${continuation}`;

export async function storeContinuation(
    prefix: string,
    continuation: string,
    instancesMap: Map<string, SearchInstanceWithTimestamp> | undefined,
    instance: SearchResult<'video'>,
    redisClient: Redis,
): Promise<void> {
    const safeInstancesMap =
        instancesMap || (prefix === REDIS_KEY_PREFIXES.SEARCH ? searchInstances : relatedInstances);

    safeInstancesMap.set(continuation, {
        instance: instance as SearchResult<'video'>,
        timestamp: Date.now(),
    });

    await redisClient.set(
        getRedisKey(prefix, continuation),
        Date.now().toString(),
        'EX',
        Math.floor(CLEANUP_TIMEOUT / 1000),
    );

    if (safeInstancesMap.size > MAX_INSTANCES_PER_TYPE) {
        const entries = Array.from(safeInstancesMap.entries()).sort(
            (a, b) => a[1].timestamp - b[1].timestamp,
        );
        const entriesToRemove = Math.ceil(MAX_INSTANCES_PER_TYPE * 0.1);
        const keysToRemove = entries.slice(0, entriesToRemove).map((entry) => entry[0]);

        for (const key of keysToRemove) {
            safeInstancesMap.delete(key);
            await redisClient.del(getRedisKey(prefix, key));
        }

        const logPrefix = prefix === REDIS_KEY_PREFIXES.SEARCH ? 'Search' : 'Related';
        youtubeiLogger.debug(
            `${logPrefix} cache limit reached. Removed ${keysToRemove.length} oldest entries.`,
        );
    }
}

export async function cleanupOldInstances() {
    const now = Date.now();
    let cleanedSearch = 0;
    let cleanedRelated = 0;

    for (const [key, value] of searchInstances.entries()) {
        if (now - value.timestamp > CLEANUP_TIMEOUT) {
            searchInstances.delete(key);
            cleanedSearch++;
        }
    }

    for (const [key, value] of relatedInstances.entries()) {
        if (now - value.timestamp > CLEANUP_TIMEOUT) {
            relatedInstances.delete(key);
            cleanedRelated++;
        }
    }

    if (cleanedSearch > 0 || cleanedRelated > 0) {
        recordMemoryCleanup(cleanedSearch, cleanedRelated);
        youtubeiLogger.debug(
            `Memory cleanup: ${cleanedSearch} search instances, ${cleanedRelated} related instances`,
        );
    }

    youtubeiLogger.debug(
        `Current cache size: ${searchInstances.size} search, ${relatedInstances.size} related`,
    );

    return { cleanedSearch, cleanedRelated };
}
