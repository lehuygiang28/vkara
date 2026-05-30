import type {
    EngagementKind,
    PersonalizableVideo,
    PersonalizationProfile,
    SearchHistoryEntry,
} from './types';
import { PERSONALIZATION_LIMITS } from './types';

const ENGAGEMENT_WEIGHT: Record<EngagementKind, number> = {
    play: 3,
    queue: 1,
};

export const normalizeChannelKey = (name: string): string => name.trim().toLowerCase();

export const createEmptyProfile = (): PersonalizationProfile => ({
    searchHistory: [],
    channelScores: {},
    recentVideos: [],
});

const trimSearchHistory = (history: SearchHistoryEntry[]): SearchHistoryEntry[] =>
    history.slice(0, PERSONALIZATION_LIMITS.maxSearchHistory);

const trimChannelScores = (scores: Record<string, number>): Record<string, number> => {
    const entries = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, PERSONALIZATION_LIMITS.maxChannelScores);

    return Object.fromEntries(entries);
};

const trimRecentVideos = (videos: PersonalizableVideo[]): PersonalizableVideo[] =>
    videos.slice(0, PERSONALIZATION_LIMITS.maxRecentVideos);

export const recordSearch = (
    profile: PersonalizationProfile,
    query: string,
    isKaraoke: boolean,
    at = Date.now(),
): PersonalizationProfile => {
    const trimmed = query.trim();
    if (!trimmed) {
        return profile;
    }

    const withoutDuplicate = profile.searchHistory.filter(
        (entry) => entry.query.toLowerCase() !== trimmed.toLowerCase() || entry.isKaraoke !== isKaraoke,
    );

    const searchHistory = trimSearchHistory([
        { query: trimmed, isKaraoke, at },
        ...withoutDuplicate,
    ]);

    return { ...profile, searchHistory };
};

export const removeSearchHistoryEntry = (
    profile: PersonalizationProfile,
    query: string,
): PersonalizationProfile => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return profile;
    }

    return {
        ...profile,
        searchHistory: profile.searchHistory.filter(
            (entry) => entry.query.trim().toLowerCase() !== normalized,
        ),
    };
};

export const clearSearchHistory = (profile: PersonalizationProfile): PersonalizationProfile => ({
    ...profile,
    searchHistory: [],
});

export const recordVideoEngagement = (
    profile: PersonalizationProfile,
    video: PersonalizableVideo,
    kind: EngagementKind,
): PersonalizationProfile => {
    const channelName = video.channels[0]?.name;
    const weight = ENGAGEMENT_WEIGHT[kind];
    const nextScores = { ...profile.channelScores };

    if (channelName) {
        const key = normalizeChannelKey(channelName);
        nextScores[key] = (nextScores[key] ?? 0) + weight;
    }

    const withoutDuplicate = profile.recentVideos.filter((item) => item.id !== video.id);
    const recentVideos = trimRecentVideos([video, ...withoutDuplicate]);

    return {
        ...profile,
        channelScores: trimChannelScores(nextScores),
        recentVideos,
    };
};

export const getTopChannels = (
    profile: PersonalizationProfile,
    limit = PERSONALIZATION_LIMITS.topChannelCount,
): string[] => {
    const channelNames = new Map<string, string>();

    for (const video of profile.recentVideos) {
        const name = video.channels[0]?.name;
        if (name) {
            channelNames.set(normalizeChannelKey(name), name);
        }
    }

    return Object.entries(profile.channelScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([key]) => channelNames.get(key) ?? key);
};

export const getRecentSearchQueries = (
    profile: PersonalizationProfile,
    limit = PERSONALIZATION_LIMITS.recentSearchBoostCount,
): string[] =>
    profile.searchHistory.slice(0, limit).map((entry) => entry.query);
