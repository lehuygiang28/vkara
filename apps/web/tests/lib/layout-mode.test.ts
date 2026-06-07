import { describe, expect, it } from 'vitest';

import { getEffectiveLayoutMode, getSuggestedLayoutMode, TV_MIN_WIDTH_PX } from '@/lib/layout-mode';

describe('getSuggestedLayoutMode', () => {
    it('suggests player at TV breakpoint and remote below', () => {
        expect(getSuggestedLayoutMode(TV_MIN_WIDTH_PX)).toBe('player');
        expect(getSuggestedLayoutMode(TV_MIN_WIDTH_PX - 1)).toBe('remote');
        expect(getSuggestedLayoutMode(0)).toBe('remote');
    });
});

describe('getEffectiveLayoutMode', () => {
    it('respects user override regardless of viewport', () => {
        expect(
            getEffectiveLayoutMode({
                storedLayoutMode: 'remote',
                layoutModeSource: 'user',
                viewportWidth: 1920,
            }),
        ).toBe('remote');
    });

    it('uses viewport suggestion when source is auto', () => {
        expect(
            getEffectiveLayoutMode({
                storedLayoutMode: 'remote',
                layoutModeSource: 'auto',
                viewportWidth: 1280,
            }),
        ).toBe('player');
    });

    it('falls back to stored mode when viewport width is zero', () => {
        expect(
            getEffectiveLayoutMode({
                storedLayoutMode: 'player',
                layoutModeSource: 'auto',
                viewportWidth: 0,
            }),
        ).toBe('player');
    });
});
