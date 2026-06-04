import { describe, expect, it } from 'vitest';

import { resolveYoutubeLiveFlag } from '@src/youtube-live';

describe('resolveYoutubeLiveFlag', () => {
    it('returns true when isLive is set', () => {
        expect(resolveYoutubeLiveFlag({ isLive: true, duration: 0, uploadedAt: '' })).toBe(true);
    });

    it('infers live when upload and duration are both missing', () => {
        expect(resolveYoutubeLiveFlag({ duration: 0, uploadedAt: '' })).toBe(true);
        expect(resolveYoutubeLiveFlag({ duration: null, uploadDate: null })).toBe(true);
    });

    it('returns false for normal VOD metadata', () => {
        expect(
            resolveYoutubeLiveFlag({
                duration: 240,
                uploadedAt: '2 days ago',
            }),
        ).toBe(false);
    });
});
