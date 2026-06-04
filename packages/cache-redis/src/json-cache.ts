import type Redis from 'ioredis';

export type JsonCacheValidator<T> = (parsed: unknown) => T | undefined;

export type RedisJsonCache<T> = {
    get: (redis: Redis, key: string) => Promise<T | undefined>;
    set: (redis: Redis, key: string, value: T, ttlSeconds: number) => Promise<void>;
};

export function createRedisJsonCache<T>(validate: JsonCacheValidator<T>): RedisJsonCache<T> {
    return {
        async get(redisClient, key) {
            try {
                const payload = await redisClient.get(key);
                if (!payload) {
                    return undefined;
                }
                return validate(JSON.parse(payload));
            } catch {
                return undefined;
            }
        },

        async set(redisClient, key, value, ttlSeconds) {
            try {
                await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            } catch {
                // Fail-open: callers may continue without persisting cache.
            }
        },
    };
}
