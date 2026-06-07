import { describe, expect, test } from 'vitest';

import {
    clearSearchHistory,
    createEmptyProfile,
    normalizeChannelKey,
    recordSearch,
    removeSearchHistoryEntry,
} from '../src/profile';
import { PERSONALIZATION_LIMITS } from '../src/types';

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
            recentVideos: [
                { id: 'v1', title: 'Song', channels: [{ name: 'Ch', verified: false }] },
            ],
        };

        const cleared = clearSearchHistory(profile);

        expect(cleared.searchHistory).toEqual([]);
        expect(cleared.channelScores).toEqual(profile.channelScores);
        expect(cleared.recentVideos).toEqual(profile.recentVideos);
    });

    test('recordSearch ignores blank queries', () => {
        const profile = createEmptyProfile();
        expect(recordSearch(profile, '   ', false)).toBe(profile);
        expect(recordSearch(profile, '\n\t', false)).toBe(profile);
        expect(
            recordSearch(profile, '<script>alert(1)</script>', false).searchHistory[0]?.query,
        ).toBe('<script>alert(1)</script>');
    });

    test('recordSearch dedupes case-insensitively but keeps karaoke flag variants', () => {
        let profile = recordSearch(createEmptyProfile(), 'Song', false);
        profile = recordSearch(profile, 'song', true);

        expect(profile.searchHistory).toHaveLength(2);
        expect(profile.searchHistory.map((e) => e.isKaraoke)).toEqual([true, false]);
    });

    test('recordSearch trims history to max length', () => {
        let profile = createEmptyProfile();
        for (let i = 0; i < PERSONALIZATION_LIMITS.maxSearchHistory + 5; i++) {
            profile = recordSearch(profile, `q${i}`, false);
        }
        expect(profile.searchHistory).toHaveLength(PERSONALIZATION_LIMITS.maxSearchHistory);
        expect(profile.searchHistory[0]?.query).toBe(
            `q${PERSONALIZATION_LIMITS.maxSearchHistory + 4}`,
        );
    });

    test('removeSearchHistoryEntry is no-op for blank query', () => {
        const profile = createEmptyProfile();
        expect(removeSearchHistoryEntry(profile, '   ')).toBe(profile);
    });
});

describe('normalizeChannelKey', () => {
    test('trims and lowercases channel names', () => {
        expect(normalizeChannelKey('  Karaoke KING  ')).toBe('karaoke king');
    });
});
