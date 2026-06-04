import { describe, expect, it } from 'vitest';

import { formatPlaybackSeconds } from '@/lib/format-playback-time';

describe('formatPlaybackSeconds', () => {
    it('formats sub-hour as M:SS without leading hour', () => {
        expect(formatPlaybackSeconds(65)).toBe('1:05');
        expect(formatPlaybackSeconds(0)).toBe('0:00');
    });

    it('formats hour-plus as H:MM:SS', () => {
        expect(formatPlaybackSeconds(3661)).toBe('1:01:01');
    });

    it('floors and clamps negative input to zero', () => {
        expect(formatPlaybackSeconds(-10)).toBe('0:00');
        expect(formatPlaybackSeconds(59.9)).toBe('0:59');
    });
});
