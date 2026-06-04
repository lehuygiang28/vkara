export type SearchHistoryEntry = {
    query: string;
    isKaraoke: boolean;
    at: number;
};

export type EngagementKind = 'play' | 'queue';

export type PersonalizableVideo = {
    id: string;
    title: string;
    channels: { name: string; verified: boolean }[];
};

export type PersonalizationProfile = {
    searchHistory: SearchHistoryEntry[];
    channelScores: Record<string, number>;
    recentVideos: PersonalizableVideo[];
};

export type RankContext = {
    query: string;
    isKaraoke: boolean;
    roomHistory?: PersonalizableVideo[];
};

export const PERSONALIZATION_LIMITS = {
    maxSearchHistory: 50,
    maxChannelScores: 20,
    maxRecentVideos: 30,
    recentSearchBoostCount: 5,
    topChannelCount: 5,
} as const;
