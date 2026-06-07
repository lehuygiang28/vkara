import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    recordSearch as recordSearchProfile,
    recordVideoEngagement as recordVideoEngagementProfile,
    removeSearchHistoryEntry,
    clearSearchHistory as clearSearchHistoryProfile,
    type EngagementKind,
    type PersonalizableVideo,
    type PersonalizationProfile,
} from '@vkara/personalization';

import type { YouTubeVideo } from '@vkara/youtube';

import { createMigratingPersistStorage } from '@/lib/persisted-storage';

const toPersonalizableVideo = (video: YouTubeVideo): PersonalizableVideo => ({
    id: video.id,
    title: video.title,
    channels: video.channels,
});

interface PersonalizationState {
    searchHistory: PersonalizationProfile['searchHistory'];
    channelScores: PersonalizationProfile['channelScores'];
    recentVideos: YouTubeVideo[];
    recordSearch: (query: string, isKaraoke: boolean) => void;
    recordEngagement: (video: YouTubeVideo, kind: EngagementKind) => void;
    removeSearchHistory: (query: string) => void;
    clearSearchHistory: () => void;
    getProfile: () => PersonalizationProfile;
    clearPersonalization: () => void;
}

export const usePersonalizationStore = create(
    persist<PersonalizationState>(
        (set, get) => ({
            searchHistory: [],
            channelScores: {},
            recentVideos: [] as YouTubeVideo[],

            recordSearch: (query, isKaraoke) => {
                set((state) => {
                    const updated = recordSearchProfile(get().getProfile(), query, isKaraoke);
                    return {
                        ...state,
                        searchHistory: updated.searchHistory,
                    };
                });
            },

            recordEngagement: (video, kind) => {
                set((state) => {
                    const updated = recordVideoEngagementProfile(get().getProfile(), video, kind);
                    const recentVideos = updated.recentVideos.map((item) => {
                        if (item.id === video.id) {
                            return video;
                        }
                        return (
                            state.recentVideos.find((existing) => existing.id === item.id) ??
                            (item as YouTubeVideo)
                        );
                    });

                    return {
                        ...state,
                        channelScores: updated.channelScores,
                        recentVideos,
                    };
                });
            },

            removeSearchHistory: (query) => {
                set((state) => ({
                    ...state,
                    searchHistory: removeSearchHistoryEntry(get().getProfile(), query)
                        .searchHistory,
                }));
            },

            clearSearchHistory: () => {
                set((state) => ({
                    ...state,
                    searchHistory: clearSearchHistoryProfile(get().getProfile()).searchHistory,
                }));
            },

            getProfile: (): PersonalizationProfile => {
                const { searchHistory, channelScores, recentVideos } = get();
                return {
                    searchHistory,
                    channelScores,
                    recentVideos: recentVideos.map(toPersonalizableVideo),
                };
            },

            clearPersonalization: () => {
                set((state) => ({
                    ...state,
                    searchHistory: [],
                    channelScores: {},
                    recentVideos: [],
                }));
            },
        }),
        {
            name: 'vkara-personalization',
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) =>
                ({
                    searchHistory: state.searchHistory,
                    channelScores: state.channelScores,
                    recentVideos: state.recentVideos,
                }) as PersonalizationState,
        },
    ),
);

export const getPersonalizationProfile = (): PersonalizationProfile =>
    usePersonalizationStore.getState().getProfile();
