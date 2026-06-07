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

describe('TikTok queue items', () => {
    it('plays TikTok videos without YouTube embeddability check', async () => {
        const redis = { mget: vi.fn() } as unknown as Redis;
        const tiktokVideo = {
            id: '7648671913983968776',
            title: 'MTP clip',
            duration: 30,
            duration_formatted: '0:30',
            type: 'video',
            uploadedAt: '',
            url: 'https://www.tiktok.com/@user/video/7648671913983968776',
            views: 1000,
            channels: [{ name: 'User', verified: false }],
            thumbnails: [{ url: 'https://example.com/cover.jpg' }],
            source: 'tiktok' as const,
        };

        const result = await resolveNextEmbeddableFromQueue(redis, [tiktokVideo]);

        expect(result.video).toEqual(tiktokVideo);
        expect(result.remainingQueue).toEqual([]);
        expect(result.skippedCount).toBe(0);
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
