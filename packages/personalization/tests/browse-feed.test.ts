import { describe, expect, test } from 'vitest';

import {
    buildBrowseFeedRankContext,
    buildBrowseFeedSessionKey,
    buildBrowseFeedSources,
    hasBrowseFeedSources,
    rankBrowseFeedBatch,
} from '../src/browse-feed';
import { createEmptyProfile, recordSearch, recordVideoEngagement } from '../src/profile';
import type { PersonalizableVideo } from '../src/types';

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
        expect(
            sources.some((source) => source.kind === 'search' && source.query === 'hoàng luân'),
        ).toBe(true);
    });

    test('falls back to profile channels when search history is empty', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(profile, video('v1', 'A', 'Kara King'), 'play');

        const sources = buildBrowseFeedSources(profile, { historyQueue: [] });

        expect(
            sources.some((source) => source.kind === 'search' && source.query === 'Kara King'),
        ).toBe(true);
    });
});

describe('buildBrowseFeedSessionKey', () => {
    test('changes only when search history identity changes', () => {
        let profile = createEmptyProfile();
        profile = recordSearch(profile, 'karaoke', true);
        const keyAfterSearch = buildBrowseFeedSessionKey(profile);

        profile = recordVideoEngagement(profile, video('v1', 'A', 'Kara King'), 'queue');
        expect(buildBrowseFeedSessionKey(profile)).toBe(keyAfterSearch);

        profile = recordSearch(profile, 'another', false);
        expect(buildBrowseFeedSessionKey(profile)).not.toBe(keyAfterSearch);
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

    test('returns empty when all candidates are filtered as duplicates', () => {
        const profile = createEmptyProfile();
        const ctx = buildBrowseFeedRankContext(profile, { historyQueue: [] });
        const existing = new Set(['only']);

        expect(rankBrowseFeedBatch([video('only', 'Dup')], existing, profile, ctx)).toEqual([]);
    });
});

describe('hasBrowseFeedSources', () => {
    test('is false for empty profile and room', () => {
        expect(hasBrowseFeedSources(createEmptyProfile(), { historyQueue: [] })).toBe(false);
    });

    test('is true when room has playingNow', () => {
        expect(
            hasBrowseFeedSources(createEmptyProfile(), {
                playingNow: video('live', 'Live'),
                historyQueue: [],
            }),
        ).toBe(true);
    });
});
