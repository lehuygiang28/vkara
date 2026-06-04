import Redis from 'ioredis';
import { describe, expect, it, vi } from 'vitest';

import { createRedisJsonCache } from '../src/json-cache';

type Sample = { id: string; count: number };

const validate = (parsed: unknown): Sample | undefined => {
    if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'id' in parsed &&
        'count' in parsed &&
        typeof (parsed as Sample).id === 'string' &&
        typeof (parsed as Sample).count === 'number'
    ) {
        return parsed as Sample;
    }
    return undefined;
};

describe('createRedisJsonCache', () => {
    const cache = createRedisJsonCache(validate);

    it('returns undefined for missing key', async () => {
        const redis = { get: vi.fn().mockResolvedValue(null) } as unknown as Redis;
        await expect(cache.get(redis, 'missing')).resolves.toBeUndefined();
    });

    it('parses and validates JSON', async () => {
        const redis = {
            get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'a', count: 2 })),
        } as unknown as Redis;

        await expect(cache.get(redis, 'k')).resolves.toEqual({ id: 'a', count: 2 });
    });

    it('returns undefined for invalid JSON shape', async () => {
        const redis = {
            get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'a' })),
        } as unknown as Redis;

        await expect(cache.get(redis, 'k')).resolves.toBeUndefined();
    });

    it('returns undefined for malformed JSON', async () => {
        const redis = { get: vi.fn().mockResolvedValue('{not json') } as unknown as Redis;
        await expect(cache.get(redis, 'k')).resolves.toBeUndefined();
    });

    it('sets JSON with TTL', async () => {
        const set = vi.fn().mockResolvedValue('OK');
        const redis = { set } as unknown as Redis;

        await cache.set(redis, 'k', { id: 'b', count: 1 }, 120);
        expect(set).toHaveBeenCalledWith('k', JSON.stringify({ id: 'b', count: 1 }), 'EX', 120);
    });
});
