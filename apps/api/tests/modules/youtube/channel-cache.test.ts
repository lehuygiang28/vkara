import { describe, expect, it, vi } from 'vitest';

import { getCachedChannel } from '@/modules/youtube/channel-cache';

describe('getCachedChannel', () => {
    it('returns validated channel from Redis JSON', async () => {
        const redis = {
            get: vi
                .fn()
                .mockResolvedValue(
                    JSON.stringify({ id: 'UCabc', name: 'Artist', verified: true }),
                ),
        } as never;

        await expect(getCachedChannel(redis, 'UCabc')).resolves.toEqual({
            id: 'UCabc',
            name: 'Artist',
            verified: true,
        });
    });

    it('rejects cache payloads with non-string id or name', async () => {
        const redis = {
            get: vi
                .fn()
                .mockResolvedValueOnce(
                    JSON.stringify({ id: 1, name: 'Artist', verified: true }),
                )
                .mockResolvedValueOnce(
                    JSON.stringify({ id: 'UCabc', name: ['x'], verified: false }),
                ),
        } as never;

        await expect(getCachedChannel(redis, 'UCabc')).resolves.toBeUndefined();
        await expect(getCachedChannel(redis, 'UCabc')).resolves.toBeUndefined();
    });
});
