import { describe, expect, it } from 'bun:test';

import type { YouTubeVideo } from '@vkara/shared-types';

import { mergeQueueAfterAdvance } from './merge-queue-after-advance';

function video(id: string): YouTubeVideo {
    return {
        id,
        title: id,
        thumbnail: { url: `https://example.com/${id}.jpg`, width: 120, height: 90 },
        channel: { id: 'ch', name: 'Channel' },
        duration: 180,
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
});
