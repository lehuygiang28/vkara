import { describe, expect, it } from 'vitest';

import { SCROLL_TO_TOP_THRESHOLD } from '@/hooks/use-scroll-to-top';

function readScrollTopVisible(scrollTop: number, threshold: number): boolean {
    return scrollTop > threshold;
}

describe('scroll-to-top visibility', () => {
    it('uses default threshold constant', () => {
        expect(SCROLL_TO_TOP_THRESHOLD).toBe(200);
    });

    it('shows button only after crossing threshold', () => {
        expect(readScrollTopVisible(0, 200)).toBe(false);
        expect(readScrollTopVisible(200, 200)).toBe(false);
        expect(readScrollTopVisible(201, 200)).toBe(true);
    });
});
