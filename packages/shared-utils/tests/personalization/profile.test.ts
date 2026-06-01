import { describe, expect, test } from 'vitest';

import {
    clearSearchHistory,
    createEmptyProfile,
    recordSearch,
    removeSearchHistoryEntry,
} from '@src/personalization/profile';

describe('search history mutations', () => {
    test('removeSearchHistoryEntry removes all case-insensitive matches', () => {
        let profile = createEmptyProfile();
        profile = recordSearch(profile, 'Hoàng Luân', false);
        profile = recordSearch(profile, 'đức mạnh', true);
        profile = recordSearch(profile, 'hoàng luân', false);

        profile = removeSearchHistoryEntry(profile, 'HOÀNG LUÂN');

        expect(profile.searchHistory.map((entry) => entry.query)).toEqual(['đức mạnh']);
    });

    test('clearSearchHistory empties history only', () => {
        let profile = createEmptyProfile();
        profile = recordSearch(profile, 'karaoke', false);
        profile = {
            ...profile,
            channelScores: { test: 1 },
            recentVideos: [{ id: 'v1', title: 'Song', channels: [{ name: 'Ch', verified: false }] }],
        };

        const cleared = clearSearchHistory(profile);

        expect(cleared.searchHistory).toEqual([]);
        expect(cleared.channelScores).toEqual(profile.channelScores);
        expect(cleared.recentVideos).toEqual(profile.recentVideos);
    });
});
