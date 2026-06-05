import { describe, expect, it } from 'vitest';

import { isCacheablePlaylistDetails } from '@src/youtube-playlist-details';

describe('isCacheablePlaylistDetails', () => {
    it('allows responses with at least one video', () => {
        expect(
            isCacheablePlaylistDetails({
                playlist: { id: 'PL1', title: 'Hits', videoCount: 40 },
                videos: [{ id: 'v1' } as never],
            }),
        ).toBe(true);
    });

    it('allows legitimately empty playlists', () => {
        expect(
            isCacheablePlaylistDetails({
                playlist: { id: 'PL1', title: 'Empty', videoCount: 0 },
                videos: [],
            }),
        ).toBe(true);
    });

    it('rejects metadata-only failures with zero videos but positive videoCount', () => {
        expect(
            isCacheablePlaylistDetails({
                playlist: { id: 'PL1', title: 'Kara list', videoCount: 40 },
                videos: [],
            }),
        ).toBe(false);
    });
});
