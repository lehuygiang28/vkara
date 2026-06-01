import { describe, expect, it } from 'vitest';

import { resolveCompactVideoChannels } from '@/modules/youtube/resolve-compact-channels';

describe('resolveCompactVideoChannels', () => {
    it('falls back to full video channels when compact search omits channel', async () => {
        const compact = {
            id: 'SlQR9iu09bQ',
            title: 'SON TUNG M-TP x TYGA | COME MY WAY | OFFICIAL MUSIC VIDEO',
            channel: {},
            getVideo: async () => ({
                channels: [
                    { id: 'UClyA28-01x4z60eWQ2kiNbA', name: 'Sơn Tùng M-TP Official' },
                    { id: 'UC-Eh1lR_tWVtv9AvxLybMtQ', name: 'Tyga' },
                ],
            }),
        } as never;

        const client = {} as never;
        const redisClient = {
            get: async () => null,
            set: async () => 'OK',
        } as never;

        const channels = await resolveCompactVideoChannels(
            compact,
            redisClient,
            true,
            client,
        );

        expect(channels.map((channel) => channel.name)).toEqual([
            'Sơn Tùng M-TP Official',
            'Tyga',
        ]);
    });
});
