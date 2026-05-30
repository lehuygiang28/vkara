import { describe, expect, test } from 'bun:test';

import { recordSearch, recordVideoEngagement } from './profile';
import { rankVideos } from './rank-videos';
import type { PersonalizableVideo, PersonalizationProfile } from './types';

const baseVideo = (id: string, title: string, channel: string): PersonalizableVideo => ({
    id,
    title,
    channels: [{ name: channel, verified: false }],
});

describe('rankVideos', () => {
    test('boosts videos from top channels while preserving stable order on ties', () => {
        const profile: PersonalizationProfile = {
            searchHistory: [],
            channelScores: { 'duc manh melody': 6 },
            recentVideos: [baseVideo('a', 'Stream A', 'Đức Mạnh Melody')],
        };

        const videos = [
            baseVideo('1', 'Other video', 'Random Channel'),
            baseVideo('2', 'LCK co-stream', 'Đức Mạnh Melody'),
            baseVideo('3', 'Another random', 'Other'),
        ];

        const ranked = rankVideos(videos, profile, { query: 'lck', isKaraoke: false });

        expect(ranked[0]?.id).toBe('2');
        expect(ranked[1]?.id).toBe('1');
        expect(ranked[2]?.id).toBe('3');
    });

    test('boosts karaoke-like titles when karaoke mode is on', () => {
        let profile: PersonalizationProfile = {
            searchHistory: [],
            channelScores: {},
            recentVideos: [],
        };

        profile = recordSearch(profile, 'son tung', true);

        const videos = [
            baseVideo('1', 'Official MV', 'Channel A'),
            baseVideo('2', 'Son Tung karaoke beat', 'Channel B'),
        ];

        const ranked = rankVideos(videos, profile, { query: 'son tung', isKaraoke: true });

        expect(ranked[0]?.id).toBe('2');
    });

    test('records engagement and increases channel affinity score', () => {
        let profile: PersonalizationProfile = {
            searchHistory: [],
            channelScores: {},
            recentVideos: [],
        };

        profile = recordVideoEngagement(
            profile,
            baseVideo('v1', 'Title', 'Favorite Channel'),
            'play',
        );

        expect(profile.channelScores['favorite channel']).toBe(3);
        expect(profile.recentVideos[0]?.id).toBe('v1');
    });
});
