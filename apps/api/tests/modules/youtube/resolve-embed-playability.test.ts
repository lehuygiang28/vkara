import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';

import * as embeddableModule from '@/modules/youtube/embeddable';
import { resolveEmbeddabilityMany } from '@/modules/youtube/resolve-embed-playability';

describe('resolveEmbeddabilityMany', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns Redis hits without fetching YouTube', async () => {
        const mget = vi.fn<Redis['mget']>().mockResolvedValue(['1', '0']);
        const redis = { mget } as unknown as Redis;

        const fetchSpy = vi.spyOn(embeddableModule, 'fetchEmbeddableFromYoutube');

        const result = await resolveEmbeddabilityMany(redis, ['hit-ok', 'hit-no']);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.get('hit-ok')).toBe(true);
        expect(result.get('hit-no')).toBe(false);
    });

    it('fetches misses and writes Redis', async () => {
        const mget = vi.fn<Redis['mget']>().mockResolvedValue([null]);
        const setex = vi.fn().mockReturnThis();
        const exec = vi.fn().mockResolvedValue([]);
        const pipeline = vi.fn(() => ({ setex, exec }));
        const redis = { mget, pipeline } as unknown as Redis;

        vi.spyOn(embeddableModule, 'fetchEmbeddableFromYoutube').mockResolvedValue(true);

        const result = await resolveEmbeddabilityMany(redis, ['miss-1']);

        expect(embeddableModule.fetchEmbeddableFromYoutube).toHaveBeenCalledWith('miss-1');
        expect(result.get('miss-1')).toBe(true);
        expect(setex).toHaveBeenCalledWith('youtube-embed:miss-1', expect.any(Number), '1');
    });
});
