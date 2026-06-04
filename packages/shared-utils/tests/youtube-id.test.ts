import { describe, expect, it } from 'vitest';

import { isValidYoutubeVideoId } from '@src/youtube-id';

describe('isValidYoutubeVideoId', () => {
    it('accepts standard 11-character ids', () => {
        expect(isValidYoutubeVideoId('dQw4w9WgXcQ')).toBe(true);
        expect(isValidYoutubeVideoId('abc123_-XYZ')).toBe(true);
    });

    it('rejects channel, playlist, and short ids', () => {
        expect(isValidYoutubeVideoId('UCxxxxxxxxxx')).toBe(false);
        expect(isValidYoutubeVideoId('PLxxxxxxxxxx')).toBe(false);
        expect(isValidYoutubeVideoId('short')).toBe(false);
        expect(isValidYoutubeVideoId(null)).toBe(false);
        expect(isValidYoutubeVideoId('')).toBe(false);
    });
});
