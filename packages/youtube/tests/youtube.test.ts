import { describe, expect, it } from 'vitest';

import { normalizeVideoChannels } from '../src/youtube';

describe('normalizeVideoChannels', () => {
    it('returns channels array when present', () => {
        const channels = [{ name: 'A', verified: true }];
        expect(normalizeVideoChannels({ channels })).toEqual(channels);
    });

    it('maps legacy single channel field', () => {
        expect(
            normalizeVideoChannels({
                channel: { name: 'Legacy', verified: true },
            }),
        ).toEqual([{ name: 'Legacy', verified: true }]);
    });

    it('defaults verified false when legacy channel omits it', () => {
        expect(normalizeVideoChannels({ channel: { name: 'Legacy' } })).toEqual([
            { name: 'Legacy', verified: false },
        ]);
    });

    it('returns placeholder when no channel data', () => {
        expect(normalizeVideoChannels({})).toEqual([{ name: '—', verified: false }]);
    });

    it('prefers non-empty channels over legacy channel', () => {
        expect(
            normalizeVideoChannels({
                channels: [{ name: 'New', verified: false }],
                channel: { name: 'Legacy', verified: true },
            }),
        ).toEqual([{ name: 'New', verified: false }]);
    });

    it('ignores empty channels array and uses legacy channel', () => {
        expect(
            normalizeVideoChannels({
                channels: [],
                channel: { name: 'Legacy' },
            }),
        ).toEqual([{ name: 'Legacy', verified: false }]);
    });
});
