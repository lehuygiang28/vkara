import { describe, expect, test } from 'vitest';

import {
    createEmptyProfile,
    getRecentSearchQueries,
    getTopChannels,
    recordSearch,
    recordVideoEngagement,
} from '../src/profile';

const video = (id: string, channel: string) => ({
    id,
    title: id,
    channels: [{ name: channel, verified: false }],
});

describe('recordVideoEngagement', () => {
    test('boosts channel score and prepends recent videos', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(profile, video('v1', 'Karaoke A'), 'queue');
        profile = recordVideoEngagement(profile, video('v2', 'Karaoke B'), 'play');

        expect(profile.channelScores).toMatchObject({
            'karaoke a': expect.any(Number),
            'karaoke b': expect.any(Number),
        });
        expect(profile.recentVideos.map((v) => v.id)).toEqual(['v2', 'v1']);
    });

    test('deduplicates recent videos by id', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(profile, video('v1', 'Ch'), 'queue');
        profile = recordVideoEngagement(profile, video('v1', 'Ch'), 'play');

        expect(profile.recentVideos).toHaveLength(1);
    });
});

describe('getTopChannels', () => {
    test('orders by score and resolves display names from recent videos', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(profile, video('a', 'Alpha Channel'), 'play');
        profile = recordVideoEngagement(profile, video('b', 'Beta Channel'), 'queue');
        profile = {
            ...profile,
            channelScores: {
                ...profile.channelScores,
                'beta channel': (profile.channelScores['beta channel'] ?? 0) + 10,
            },
        };

        expect(getTopChannels(profile, 2)).toEqual(['Beta Channel', 'Alpha Channel']);
    });
});

describe('getRecentSearchQueries', () => {
    test('returns newest queries up to limit', () => {
        let profile = createEmptyProfile();
        profile = recordSearch(profile, 'first', false);
        profile = recordSearch(profile, 'second', true);
        profile = recordSearch(profile, 'third', false);

        expect(getRecentSearchQueries(profile, 2)).toEqual(['third', 'second']);
    });

    test('getTopChannels returns empty for empty profile', () => {
        expect(getTopChannels(createEmptyProfile())).toEqual([]);
    });

    test('recordVideoEngagement ignores videos without channel name', () => {
        let profile = createEmptyProfile();
        profile = recordVideoEngagement(
            profile,
            { id: 'v1', title: 'No channel', channels: [] },
            'queue',
        );

        expect(profile.channelScores).toEqual({});
        expect(profile.recentVideos).toHaveLength(1);
    });
});
