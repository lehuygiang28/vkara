import { describe, expect, it } from 'vitest';

import { isPlayableYoutubeVideo, isSearchResultVideo } from '@/modules/youtube/video-validation';

describe('isSearchResultVideo invalid payloads', () => {
    const reject = [
        { id: '', title: 'Song' },
        { id: 'short', title: 'Song' },
        { id: 'dQw4w9WgXcQ', title: '' },
        { id: 'dQw4w9WgXcQ', title: '   ' },
        { id: 'dQw4w9WgXcQ', title: '\n\t' },
        { id: '<script>x</script>11', title: 'XSS' },
        { id: 'dQw4w9WgXcQ', title: null as never },
        { id: undefined as never, title: 'No id' },
        { id: 123 as never, title: 'Numeric id' },
        { id: 'dQw4w9WgXcQ', title: 42 as never },
    ];

    it.each(reject)('rejects %#', (item) => {
        expect(isSearchResultVideo(item)).toBe(false);
    });
});

describe('isPlayableYoutubeVideo invalid payloads', () => {
    it('rejects non-string titles and malformed ids', () => {
        expect(isPlayableYoutubeVideo({ id: '', title: 'x' })).toBe(false);
        expect(isPlayableYoutubeVideo({ id: 'bad', title: 'ok title' })).toBe(false);
        expect(
            isPlayableYoutubeVideo({
                id: 'dQw4w9WgXcQ',
                title: { en: 'hack' } as never,
            }),
        ).toBe(false);
    });
});
