import { describe, expect, it } from 'vitest';

import { isPlayableYoutubeVideo, isSearchResultVideo } from '@/modules/youtube/video-validation';

describe('isSearchResultVideo', () => {
    it('accepts valid id and non-empty title', () => {
        expect(isSearchResultVideo({ id: 'dQw4w9WgXcQ', title: 'Song' })).toBe(true);
    });

    it('rejects invalid id or blank title', () => {
        expect(isSearchResultVideo({ id: 'bad', title: 'Song' })).toBe(false);
        expect(isSearchResultVideo({ id: 'dQw4w9WgXcQ', title: '   ' })).toBe(false);
        expect(isSearchResultVideo({ id: 'dQw4w9WgXcQ', title: '' })).toBe(false);
        expect(isSearchResultVideo({ id: 'dQw4w9WgXcQ', title: null as never })).toBe(false);
    });
});

describe('isPlayableYoutubeVideo', () => {
    it('accepts valid mapped videos', () => {
        expect(
            isPlayableYoutubeVideo({
                id: 'dQw4w9WgXcQ',
                title: 'Never Gonna Give You Up',
            }),
        ).toBe(true);
    });

    it('rejects invalid ids and blank titles', () => {
        expect(isPlayableYoutubeVideo({ id: 'short', title: 'Channel' })).toBe(false);
        expect(isPlayableYoutubeVideo({ id: 'dQw4w9WgXcQ', title: '' })).toBe(false);
    });
});
