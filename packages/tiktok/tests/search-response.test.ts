import { describe, expect, it } from 'vitest';

import { isInitialSearchApiUrl, isUsableSearchResponse } from '../src/search-response';

describe('isInitialSearchApiUrl', () => {
    it('matches first-page general search for keyword', () => {
        const url =
            'https://www.tiktok.com/api/search/general/full/?keyword=bro&cursor=0&X-Bogus=abc';
        expect(isInitialSearchApiUrl(url, 'bro')).toBe(true);
    });

    it('rejects other keywords and pagination cursors', () => {
        const url =
            'https://www.tiktok.com/api/search/general/full/?keyword=bro&cursor=12&X-Bogus=abc';
        expect(isInitialSearchApiUrl(url, 'karaoke')).toBe(false);
        expect(isInitialSearchApiUrl(url, 'bro')).toBe(false);
    });
});

describe('isUsableSearchResponse', () => {
    it('accepts status_code 0 and 203 with items', () => {
        expect(isUsableSearchResponse({ status_code: 0, data: [] })).toBe(true);
        expect(
            isUsableSearchResponse({
                status_code: 203,
                data: [{ type: 1, item: { id: '1', desc: '', createTime: 0 } }],
            }),
        ).toBe(true);
    });

    it('rejects hard errors without items', () => {
        expect(isUsableSearchResponse({ status_code: 403, data: [] })).toBe(false);
    });
});
