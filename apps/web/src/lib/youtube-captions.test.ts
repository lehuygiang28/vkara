import { describe, expect, it } from 'bun:test';

import { youtubeCaptionsLanguageCode } from './youtube-captions';

describe('youtubeCaptionsLanguageCode', () => {
    it('maps vi locale to vi track', () => {
        expect(youtubeCaptionsLanguageCode('vi')).toBe('vi');
        expect(youtubeCaptionsLanguageCode('vi-VN')).toBe('vi');
    });

    it('defaults other locales to en', () => {
        expect(youtubeCaptionsLanguageCode('en')).toBe('en');
        expect(youtubeCaptionsLanguageCode('ja')).toBe('en');
    });
});
