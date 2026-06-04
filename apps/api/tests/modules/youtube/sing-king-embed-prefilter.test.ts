import { afterEach, describe, expect, it, vi } from 'vitest';
import type Redis from 'ioredis';

import { buildSingKingStyleSearchPage, SING_KING_CHANNEL_NAME } from '../../fixtures/sing-king-search';
import { filterVideosForListPrefilter } from '@/modules/youtube/resolve-embed-playability';
import { resolveNextEmbeddableFromQueue } from '@/modules/youtube/resolve-embeddable-queue';

function redisWithEmbeddability(byVideoId: Record<string, '0' | '1'>): Redis {
    return {
        mget: vi.fn().mockImplementation((...args: unknown[]) => {
            const keys = args.filter((arg): arg is string => typeof arg === 'string');
            return Promise.resolve(
                keys.map((key) => {
                    const videoId = key.replace('youtube-embed:', '');
                    return byVideoId[videoId] ?? null;
                }),
            );
        }),
        pipeline: vi.fn(() => ({
            setex: vi.fn().mockReturnThis(),
            exec: vi.fn().mockResolvedValue([]),
        })),
    } as unknown as Redis;
}

function allNonEmbeddable(page: ReturnType<typeof buildSingKingStyleSearchPage>): Record<string, '0'> {
    return Object.fromEntries(page.map((video) => [video.id, '0']));
}

/**
 * Sing King–style results: many videos block embedding on third-party sites.
 * These tests use Redis cache fixtures (no YouTube HTTP) and document current behavior:
 * one search page filtered to zero rows does not auto-fetch the next Innertube page on the server.
 */
describe('Sing King search embed prefilter', () => {
    const previousPrefilter = process.env.VKARA_EMBED_PREFILTER_AT_LIST;

    afterEach(() => {
        if (previousPrefilter === undefined) {
            delete process.env.VKARA_EMBED_PREFILTER_AT_LIST;
        } else {
            process.env.VKARA_EMBED_PREFILTER_AT_LIST = previousPrefilter;
        }
    });

    it('returns an empty list when every Sing King row is cached as non-embeddable', async () => {
        process.env.VKARA_EMBED_PREFILTER_AT_LIST = 'true';

        const page = buildSingKingStyleSearchPage(12);
        const redis = redisWithEmbeddability(allNonEmbeddable(page));

        const filtered = await filterVideosForListPrefilter(redis, page);

        expect(filtered).toEqual([]);
        expect(page.every((video) => video.channels[0]?.name === SING_KING_CHANNEL_NAME)).toBe(true);
    });

    it('keeps only embeddable rows when one Sing King result is allowed', async () => {
        process.env.VKARA_EMBED_PREFILTER_AT_LIST = 'true';

        const page = buildSingKingStyleSearchPage(5);
        const redis = redisWithEmbeddability({
            [page[0]!.id]: '0',
            [page[1]!.id]: '0',
            [page[2]!.id]: '1',
            [page[3]!.id]: '0',
            [page[4]!.id]: '0',
        });

        const filtered = await filterVideosForListPrefilter(redis, page);

        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe(page[2]?.id);
    });

    it('does not filter when prefilter flag is off (current default)', async () => {
        delete process.env.VKARA_EMBED_PREFILTER_AT_LIST;

        const page = buildSingKingStyleSearchPage(8);
        const redis = redisWithEmbeddability(allNonEmbeddable(page));

        const filtered = await filterVideosForListPrefilter(redis, page);

        expect(filtered).toHaveLength(8);
    });
});

describe('Sing King queue advance (MAX_EMBED_SKIP)', () => {
    it('stops after MAX_EMBED_SKIP when the queue head is all non-embeddable', async () => {
        const queue = buildSingKingStyleSearchPage(20);
        const redis = redisWithEmbeddability(allNonEmbeddable(queue));

        const result = await resolveNextEmbeddableFromQueue(redis, queue);

        expect(result.video).toBeNull();
        expect(result.skippedCount).toBe(20);
        expect(result.remainingQueue).toHaveLength(0);
    });

    it('plays the first embeddable video after skipping blocked Sing King rows', async () => {
        const queue = buildSingKingStyleSearchPage(6);
        const redis = redisWithEmbeddability({
            [queue[0]!.id]: '0',
            [queue[1]!.id]: '0',
            [queue[2]!.id]: '0',
            [queue[3]!.id]: '1',
            [queue[4]!.id]: '0',
            [queue[5]!.id]: '0',
        });

        const result = await resolveNextEmbeddableFromQueue(redis, queue);

        expect(result.skippedCount).toBe(3);
        expect(result.video?.id).toBe(queue[3]?.id);
        expect(result.remainingQueue.map((video) => video.id)).toEqual([
            queue[4]?.id,
            queue[5]?.id,
        ]);
    });
});
