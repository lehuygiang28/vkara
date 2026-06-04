import { describe, expect, it } from 'vitest';

import { formatSeconds, formatViewCount } from '../src/format';

describe('formatSeconds', () => {
    it('formats sub-hour durations as MM:SS', () => {
        expect(formatSeconds(65)).toBe('01:05');
        expect(formatSeconds(0)).toBe('00:00');
    });

    it('formats hour-plus durations as HH:MM:SS', () => {
        expect(formatSeconds(3661)).toBe('01:01:01');
    });

    it('returns 00:00 for invalid input', () => {
        expect(formatSeconds(null)).toBe('00:00');
        expect(formatSeconds(undefined)).toBe('00:00');
        expect(formatSeconds(-1)).toBe('00:00');
        expect(formatSeconds(Number.NaN)).toBe('00:00');
    });
});

describe('formatViewCount', () => {
    it('formats compact suffixes', () => {
        expect(formatViewCount(1_500)).toBe('1.5K');
        expect(formatViewCount(2_000_000)).toBe('2M');
    });

    it('returns 0 for non-positive values', () => {
        expect(formatViewCount(0)).toBe('0');
        expect(formatViewCount(-5)).toBe('0');
        expect(formatViewCount('no views')).toBe('0');
    });

    it('formats billions and whole numbers without decimals', () => {
        expect(formatViewCount(1_000_000_000)).toBe('1B');
        expect(formatViewCount(999)).toBe('999');
    });
});

describe('formatSeconds edge cases', () => {
    it('floors fractional seconds before formatting', () => {
        expect(formatSeconds(59.9)).toBe('00:59');
    });
});
