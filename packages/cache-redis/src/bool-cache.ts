import type Redis from 'ioredis';

export type RedisBoolCache = {
    mget: (redis: Redis, keys: string[]) => Promise<Map<string, boolean | undefined>>;
    setMany: (
        redis: Redis,
        entries: { key: string; value: boolean }[],
        ttlSeconds: number,
    ) => Promise<void>;
};

export function createRedisBoolCache(): RedisBoolCache {
    return {
        async mget(redisClient, keys) {
            const uniqueKeys = [...new Set(keys)];
            const result = new Map<string, boolean | undefined>();

            if (uniqueKeys.length === 0) {
                return result;
            }

            let values: (string | null)[];
            try {
                values = await redisClient.mget(...uniqueKeys);
            } catch {
                for (const key of uniqueKeys) {
                    result.set(key, undefined);
                }
                return result;
            }

            uniqueKeys.forEach((key, index) => {
                const value = values[index];
                if (value === '1') {
                    result.set(key, true);
                } else if (value === '0') {
                    result.set(key, false);
                } else {
                    result.set(key, undefined);
                }
            });

            return result;
        },

        async setMany(redisClient, entries, ttlSeconds) {
            if (entries.length === 0) {
                return;
            }

            try {
                const pipeline = redisClient.pipeline();
                for (const { key, value } of entries) {
                    pipeline.setex(key, ttlSeconds, value ? '1' : '0');
                }
                await pipeline.exec();
            } catch {
                // Fail-open: fetch-through remains valid when Redis is unavailable.
            }
        },
    };
}
