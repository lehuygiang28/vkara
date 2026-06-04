import { describe, expect, it } from 'vitest';

import { isVideoLive } from '@/lib/youtube-video';

describe('isVideoLive', () => {
    it('delegates to shared live heuristics', () => {
        expect(isVideoLive({ isLive: true, duration: 0, uploadedAt: '' })).toBe(true);
        expect(
            isVideoLive({
                duration: 240,
                uploadedAt: '2 days ago',
            }),
        ).toBe(false);
        expect(isVideoLive({ duration: 0, uploadedAt: '' })).toBe(true);
    });
});
