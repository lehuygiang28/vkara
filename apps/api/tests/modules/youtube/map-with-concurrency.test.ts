import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '@/modules/youtube/map-with-concurrency';

describe('mapWithConcurrency', () => {
    it('returns empty array for empty input', async () => {
        expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
    });

    it('preserves result order', async () => {
        const items = [1, 2, 3, 4, 5];
        const results = await mapWithConcurrency(items, 2, async (n) => n * 2);
        expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('uses at least one worker when limit is zero or negative', async () => {
        const results = await mapWithConcurrency([1, 2], 0, async (n) => n + 1);
        expect(results).toEqual([2, 3]);
    });

    it('caps workers to item count', async () => {
        let peak = 0;
        let active = 0;

        await mapWithConcurrency([1, 2, 3], 10, async (n) => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            active -= 1;
            return n;
        });

        expect(peak).toBeLessThanOrEqual(3);
    });
});
