import { describe, expect, it } from 'vitest';

import {
    getVideoListStackHeight,
    measureVideoListSkeletonRows,
    VIDEO_LIST_ROW_STRIDE,
} from '@/lib/video-list-layout';

describe('video-list-layout', () => {
    describe('getVideoListStackHeight', () => {
        it('returns 0 for non-positive row counts', () => {
            expect(getVideoListStackHeight(0)).toBe(0);
            expect(getVideoListStackHeight(-1)).toBe(0);
        });

        it('matches fixed row height plus space-y-1 gaps', () => {
            expect(getVideoListStackHeight(1)).toBe(100);
            expect(getVideoListStackHeight(3)).toBe(308);
            expect(getVideoListStackHeight(8)).toBe(828);
        });
    });

    describe('measureVideoListSkeletonRows', () => {
        it('respects viewportFraction and minRows', () => {
            expect(measureVideoListSkeletonRows(800, { viewportFraction: 0.5, minRows: 2 })).toBe(
                Math.max(2, Math.ceil(400 / VIDEO_LIST_ROW_STRIDE)),
            );
        });

        it('covers a full viewport height', () => {
            expect(measureVideoListSkeletonRows(844, { viewportFraction: 1, minRows: 3 })).toBe(
                Math.max(3, Math.ceil(844 / VIDEO_LIST_ROW_STRIDE)),
            );
        });
    });
});
