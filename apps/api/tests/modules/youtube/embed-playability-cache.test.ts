import { describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';

import { DEFAULT_EMBED_CACHE_TTL_SECONDS, getEmbedCacheTtlSeconds } from '@vkara/env/embed';
import {
    getEmbedCacheKey,
    mgetEmbeddability,
    setEmbeddabilityMany,
} from '@/modules/youtube/embed-playability-cache';

describe('embed-playability-cache', () => {
    it('builds stable cache keys', () => {
        expect(getEmbedCacheKey('abc123')).toBe('youtube-embed:abc123');
    });

    it('defaults TTL to 30 days', () => {
        expect(getEmbedCacheTtlSeconds({})).toBe(DEFAULT_EMBED_CACHE_TTL_SECONDS);
    });

    it('parses TTL from embed env values', () => {
        expect(getEmbedCacheTtlSeconds({ VKARA_EMBED_CACHE_TTL_SECONDS: '3600' })).toBe(3600);
    });

    it('maps MGET values to booleans', async () => {
        const mget = vi.fn<Redis['mget']>().mockResolvedValue(['1', '0', null]);
        const redis = { mget } as unknown as Redis;

        const map = await mgetEmbeddability(redis, ['a', 'b', 'c']);

        expect(mget).toHaveBeenCalledWith(
            'youtube-embed:a',
            'youtube-embed:b',
            'youtube-embed:c',
        );
        expect(map.get('a')).toBe(true);
        expect(map.get('b')).toBe(false);
        expect(map.get('c')).toBeUndefined();
    });

    it('writes SETEX via pipeline', async () => {
        const setex = vi.fn().mockReturnThis();
        const exec = vi.fn().mockResolvedValue([]);
        const pipeline = vi.fn(() => ({ setex, exec }));
        const redis = { pipeline } as unknown as Redis;
        const embed = { VKARA_EMBED_CACHE_TTL_SECONDS: '3600' };

        await setEmbeddabilityMany(
            redis,
            [
                { videoId: 'v1', canEmbed: true },
                { videoId: 'v2', canEmbed: false },
            ],
            embed,
        );

        expect(pipeline).toHaveBeenCalled();
        expect(setex).toHaveBeenCalledWith('youtube-embed:v1', 3600, '1');
        expect(setex).toHaveBeenCalledWith('youtube-embed:v2', 3600, '0');
        expect(exec).toHaveBeenCalled();
    });
});
