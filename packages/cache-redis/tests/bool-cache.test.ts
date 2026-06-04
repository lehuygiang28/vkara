import Redis from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRedisBoolCache } from '../src/bool-cache';

describe('createRedisBoolCache', () => {
    const cache = createRedisBoolCache();

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns empty map for no keys', async () => {
        const redis = {} as Redis;
        const result = await cache.mget(redis, []);
        expect(result.size).toBe(0);
    });

    it('maps MGET values to booleans', async () => {
        const redis = {
            mget: vi.fn().mockResolvedValue(['1', '0', null]),
        } as unknown as Redis;

        const result = await cache.mget(redis, ['a', 'b', 'c']);
        expect(result.get('a')).toBe(true);
        expect(result.get('b')).toBe(false);
        expect(result.get('c')).toBeUndefined();
    });

    it('fail-open on MGET error', async () => {
        const redis = {
            mget: vi.fn().mockRejectedValue(new Error('down')),
        } as unknown as Redis;

        const result = await cache.mget(redis, ['x']);
        expect(result.get('x')).toBeUndefined();
    });

    it('pipelines SETEX on setMany', async () => {
        const setex = vi.fn().mockReturnThis();
        const exec = vi.fn().mockResolvedValue([]);
        const pipeline = vi.fn(() => ({ setex, exec }));
        const redis = { pipeline } as unknown as Redis;

        await cache.setMany(
            redis,
            [
                { key: 'k1', value: true },
                { key: 'k2', value: false },
            ],
            60,
        );

        expect(pipeline).toHaveBeenCalled();
        expect(setex).toHaveBeenCalledWith('k1', 60, '1');
        expect(setex).toHaveBeenCalledWith('k2', 60, '0');
        expect(exec).toHaveBeenCalled();
    });

    it('fail-open on setMany error', async () => {
        const redis = {
            pipeline: vi.fn(() => {
                throw new Error('down');
            }),
        } as unknown as Redis;

        await expect(
            cache.setMany(redis, [{ key: 'k', value: true }], 10),
        ).resolves.toBeUndefined();
    });
});
