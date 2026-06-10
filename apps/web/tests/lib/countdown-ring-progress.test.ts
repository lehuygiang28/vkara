import { describe, expect, it } from 'vitest';

import { getCountdownRingProgress } from '@/store/countdownTimersStore';

describe('getCountdownRingProgress', () => {
    it('maps 5…1 ticks to 0…100% ring fill', () => {
        expect(getCountdownRingProgress(5, 5)).toBe(0);
        expect(getCountdownRingProgress(4, 5)).toBe(0.25);
        expect(getCountdownRingProgress(3, 5)).toBe(0.5);
        expect(getCountdownRingProgress(2, 5)).toBe(0.75);
        expect(getCountdownRingProgress(1, 5)).toBe(1);
    });

    it('clamps out-of-range values', () => {
        expect(getCountdownRingProgress(6, 5)).toBe(0);
        expect(getCountdownRingProgress(0, 5)).toBe(1);
    });
});
