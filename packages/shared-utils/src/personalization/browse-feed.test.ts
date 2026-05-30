import { describe, expect, test } from 'bun:test';

import {
    buildBrowseFeedRankContext,
    buildBrowseFeedSources,
    rankBrowseFeedBatch,
} from './browse-feed';
import { createEmptyProfile, recordSearch, recordVideoEngagement } from './profile';
import type { PersonalizableVideo } from './types';

const video = (id: string, title: string, channel = 'Alpha Channel'): PersonalizableVideo => ({
    id,
    title,
    channels: [{ name: channel, verified: false }],
});

describe('buildBrowseFeedSources', () => {
    test('prioritizes room playingNow then profile searches', () => {
        let profile = createEmptyProfile();
        profile = recordSearch(profile, 'hoàng luân', false);
        profile = recordSearch(profile, 'đức mạnh', false);

        const sources = buildBrowseFeedSources(profile, {
            playingNow: video('room-live', 'Live in room'),
            historyQueue: [video('room-h1', 'Room history')],
        });

        expect(sources[0]).toEqual({
            kind: 'related',
            videoId: 'room-live',
            seedTitle: 'Live in room',
        });
        expect(sources.some((source) => source.kind === 'search' && source.query === 'hoàng luân')).toBe(
            true,
        );
    });

    test('falls back to profile channels when search history is empty', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(profile, video('v1', 'A', 'Kara King'), 'play');

        const sources = buildBrowseFeedSources(profile, { historyQueue: [] });

        expect(sources.some((source) => source.kind === 'search' && source.query === 'Kara King')).toBe(
            true,
        );
    });
});

describe('rankBrowseFeedBatch', () => {
    test('dedupes against existing ids and boosts preferred channels', () => {
        const profile = recordVideoEngagement(
            createEmptyProfile(),
            video('seed', 'Seed', 'Alpha Channel'),
            'play',
        );
        const ctx = buildBrowseFeedRankContext(profile, { historyQueue: [] });
        const existing = new Set(['a1']);

        const ranked = rankBrowseFeedBatch(
            [video('a1', 'Dup'), video('a2', 'Alpha hit', 'Alpha Channel')],
            existing,
            profile,
            ctx,
        );

        expect(ranked.map((item) => item.id)).toEqual(['a2']);
    });
});
