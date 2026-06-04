import { describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';

import { buildSingKingStyleSearchPage } from '../../fixtures/sing-king-search';
import { resolveNextEmbeddableFromQueue } from '@/modules/youtube/resolve-embeddable-queue';

describe('resolveNextEmbeddableFromQueue', () => {
    it('returns immediately when queue is empty', async () => {
        const redis = { mget: vi.fn() } as unknown as Redis;
        const result = await resolveNextEmbeddableFromQueue(redis, []);

        expect(result).toEqual({
            video: null,
            remainingQueue: [],
            skippedCount: 0,
        });
        expect(redis.mget).not.toHaveBeenCalled();
    });
});

describe('MAX_EMBED_SKIP cap', () => {
    it('does not check more than 26 queue head items in one advance', async () => {
        const queue = buildSingKingStyleSearchPage(20);
        const extra = Array.from({ length: 10 }, (_, index) => {
            const base = buildSingKingStyleSearchPage(1)[0]!;
            return {
                ...base,
                id: `extra${index}`.padEnd(11, '0').slice(0, 11),
                title: `Extra ${index}`,
            };
        });
        const longQueue = [...queue, ...extra];

        const mget = vi.fn().mockImplementation((...args: unknown[]) => {
            const keys = args.filter((arg): arg is string => typeof arg === 'string');
            return Promise.resolve(keys.map(() => '0'));
        });
        const redis = { mget } as unknown as Redis;

        await resolveNextEmbeddableFromQueue(redis, longQueue);

        expect(mget).toHaveBeenCalledTimes(25);
    });
});
