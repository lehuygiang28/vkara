import { describe, expect, it, vi } from 'vitest';

import { createInFlightDedup } from '@/modules/youtube/in-flight-dedup';

describe('createInFlightDedup', () => {
    it('dedupes concurrent calls for the same key', async () => {
        const dedup = createInFlightDedup<string, number>();
        const factory = vi.fn(async () => 42);

        const [a, b] = await Promise.all([dedup.run('k', factory), dedup.run('k', factory)]);

        expect(a).toBe(42);
        expect(b).toBe(42);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('runs separate factories for different keys', async () => {
        const dedup = createInFlightDedup<string, string>();
        const results = await Promise.all([
            dedup.run('a', async () => 'A'),
            dedup.run('b', async () => 'B'),
        ]);

        expect(results).toEqual(['A', 'B']);
    });

    it('allows a new run after the previous promise settles', async () => {
        const dedup = createInFlightDedup<string, number>();
        let count = 0;

        await dedup.run('k', async () => {
            count += 1;
            return count;
        });
        const second = await dedup.run('k', async () => {
            count += 1;
            return count;
        });

        expect(second).toBe(2);
    });

    it('clears in-flight entry when factory rejects', async () => {
        const dedup = createInFlightDedup<string, void>();
        const fail = vi.fn(async () => {
            throw new Error('boom');
        });
        const ok = vi.fn(async () => undefined);

        await expect(dedup.run('k', fail)).rejects.toThrow('boom');
        await dedup.run('k', ok);

        expect(fail).toHaveBeenCalledTimes(1);
        expect(ok).toHaveBeenCalledTimes(1);
    });
});
