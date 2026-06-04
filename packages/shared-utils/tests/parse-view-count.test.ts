import { describe, expect, it } from 'vitest';

import {
    coerceViewCount,
    parseYoutubeViewCountText,
    resolveViewCount,
} from '@src/parse-view-count';

describe('parseYoutubeViewCountText', () => {
    it('parses compact K/M/B suffixes', () => {
        expect(parseYoutubeViewCountText('7.9M views')).toBe(7_900_000);
        expect(parseYoutubeViewCountText('1.2K')).toBe(1_200);
    });

    it('parses plain digit strings', () => {
        expect(parseYoutubeViewCountText('1,234,567 views')).toBe(1_234_567);
    });

    it('returns 0 for no views label', () => {
        expect(parseYoutubeViewCountText('No views')).toBe(0);
    });

    it('returns null when label has no parseable digits', () => {
        expect(parseYoutubeViewCountText('watching')).toBeNull();
    });

    it('returns 0 for empty input', () => {
        expect(parseYoutubeViewCountText('')).toBe(0);
    });
});

describe('coerceViewCount', () => {
    it('coerces numbers and strings', () => {
        expect(coerceViewCount(42)).toBe(42);
        expect(coerceViewCount('3.5M views')).toBe(3_500_000);
    });

    it('returns 0 for empty or invalid values', () => {
        expect(coerceViewCount(null)).toBe(0);
        expect(coerceViewCount(-1)).toBe(0);
        expect(coerceViewCount('not a number')).toBe(0);
    });
});

describe('resolveViewCount', () => {
    it('prefers parsed label text over numeric field', () => {
        expect(resolveViewCount(1, '2M views')).toBe(2_000_000);
    });

    it('falls back to numeric viewCount', () => {
        expect(resolveViewCount(5000, null)).toBe(5000);
    });

    it('ignores zero parsed text and uses numeric fallback', () => {
        expect(resolveViewCount(42, 'No views')).toBe(42);
    });
});

describe('parseYoutubeViewCountText edge cases', () => {
    it('strips bullet suffixes and watching label', () => {
        expect(parseYoutubeViewCountText('1.2K views • something')).toBe(1_200);
        expect(parseYoutubeViewCountText('500 watching')).toBe(500);
    });

    it('falls back to digit extraction when compact unit is unknown', () => {
        expect(parseYoutubeViewCountText('9.9Z')).toBe(99);
    });
});
