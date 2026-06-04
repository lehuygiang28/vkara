import { describe, expect, it } from 'vitest';

import {
    CAPTION_LANGUAGE_CODES,
    DEFAULT_CAPTION_LANGUAGE,
    isCaptionLanguageCode,
    pickCaptionTrack,
    type CaptionTrack,
} from '../src/captions';

const SAMPLE_TRACKS: CaptionTrack[] = [
    { languageCode: 'en', displayName: 'English' },
    { languageCode: 'vi', displayName: 'Vietnamese' },
    { languageCode: 'zh-CN', displayName: 'Chinese (Simplified)' },
];

describe('isCaptionLanguageCode', () => {
    it('accepts known codes', () => {
        for (const code of CAPTION_LANGUAGE_CODES) {
            expect(isCaptionLanguageCode(code)).toBe(true);
        }
        expect(isCaptionLanguageCode(DEFAULT_CAPTION_LANGUAGE)).toBe(true);
    });

    it('rejects unknown codes', () => {
        expect(isCaptionLanguageCode('xx')).toBe(false);
        expect(isCaptionLanguageCode('')).toBe(false);
        expect(isCaptionLanguageCode('<script>')).toBe(false);
        expect(isCaptionLanguageCode('vi\nen')).toBe(false);
        expect(isCaptionLanguageCode('a'.repeat(32))).toBe(false);
    });
});

describe('pickCaptionTrack', () => {
    it('returns null for empty track list', () => {
        expect(pickCaptionTrack([], 'vi')).toBeNull();
    });

    it('prefers exact language match', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, 'vi')?.languageCode).toBe('vi');
    });

    it('matches language prefix before first track fallback', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, 'zh-TW')?.languageCode).toBe('zh-CN');
    });

    it('falls back to first track when no match', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, 'ja')?.languageCode).toBe('en');
    });

    it('trims preferred language before matching', () => {
        expect(pickCaptionTrack(SAMPLE_TRACKS, '  vi  ')?.languageCode).toBe('vi');
    });
});
