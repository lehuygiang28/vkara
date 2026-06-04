import type { YouTubeVideo } from '@vkara/shared-types';
import { describe, expect, it } from 'vitest';

import { mergeQueueAfterAdvance } from '@/modules/room/merge-queue-after-advance';

function video(id: string): YouTubeVideo {
    const thumbUrl = `https://example.com/${id}.jpg`;
    return {
        id,
        title: id,
        duration: 180,
        duration_formatted: '3:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Channel', verified: false }],
        thumbnails: [{ url: thumbUrl, width: 120, height: 90 }],
    };
}

describe('mergeQueueAfterAdvance', () => {
    it('keeps remaining queue when nothing was added concurrently', () => {
        const snapshot = [video('a'), video('b'), video('c')];
        const remaining = [video('b'), video('c')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, remaining)).toEqual(remaining);
    });

    it('appends videos added while advance was resolving', () => {
        const snapshot = [video('a'), video('b')];
        const remaining = [video('b')];
        const current = [video('b'), video('concurrent')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, current)).toEqual([
            video('b'),
            video('concurrent'),
        ]);
    });

    it('does not duplicate ids already in remaining queue', () => {
        const snapshot = [video('a')];
        const remaining: YouTubeVideo[] = [];
        const current = [video('concurrent')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, current)).toEqual([video('concurrent')]);
    });

    it('preserves order: resolved tail first, then concurrent adds', () => {
        const snapshot = [video('a'), video('b'), video('c')];
        const remaining = [video('c')];
        const current = [video('c'), video('d'), video('e')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, current)).toEqual([
            video('c'),
            video('d'),
            video('e'),
        ]);
    });

    it('returns only remaining queue when current has no new ids', () => {
        const snapshot = [video('a'), video('b')];
        const remaining = [video('b')];
        const current = [video('b')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, current)).toEqual(remaining);
    });

    it('handles empty snapshot and empty remaining with concurrent adds', () => {
        const current = [video('new')];
        expect(mergeQueueAfterAdvance([], [], current)).toEqual([video('new')]);
    });

    it('ignores concurrent ids that were already in snapshot', () => {
        const snapshot = [video('a'), video('b')];
        const remaining: YouTubeVideo[] = [];
        const current = [video('a'), video('c')];

        expect(mergeQueueAfterAdvance(snapshot, remaining, current)).toEqual([video('c')]);
    });
});
