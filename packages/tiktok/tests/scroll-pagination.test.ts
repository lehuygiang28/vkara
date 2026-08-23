import { describe, expect, it } from 'vitest';

import { matchesSearchKeyword } from '../src/scroll-pagination';

describe('matchesSearchKeyword', () => {
    it('matches general search URLs for keyword', () => {
        const url =
            'https://www.tiktok.com/api/search/general/full/?keyword=karaoke&cursor=12&count=12';
        expect(matchesSearchKeyword(url, 'karaoke')).toBe(true);
        expect(matchesSearchKeyword(url, 'bro')).toBe(false);
    });
});
