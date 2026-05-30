import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { YouTubeVideo } from '@/types/youtube.type';
import { blendSuggestions, rankVideos } from '@vkara/shared-utils';
import { getYoutubeSuggestions, searchYoutube } from '@/services/youtube-api';
import { getPersonalizationProfile, usePersonalizationStore } from '@/store/personalizationStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const MIN_SUGGESTION_QUERY_LENGTH = 2;

const personalizeSearchResults = (
    items: YouTubeVideo[],
    query: string,
    isKaraoke: boolean,
): YouTubeVideo[] => {
    const roomHistory = useYouTubeStore.getState().room?.historyQueue ?? [];
    return rankVideos(items, getPersonalizationProfile(), {
        query,
        isKaraoke,
        roomHistory: roomHistory.map((video) => ({
            id: video.id,
            title: video.title,
            channels: video.channels,
        })),
    });
};

const getLocalSuggestionQueries = (): string[] => {
    const { searchHistory } = getPersonalizationProfile();
    return searchHistory.map((entry) => entry.query);
};

interface SearchState {
    searchQuery: string;
    isKaraoke: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isLoadingSuggestions: boolean;
    searchResults: YouTubeVideo[];
    suggestions: string[];
    nextToken: string | null;
    error: string | null;
    loadMoreFailed: boolean;

    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    retryLoadMore: () => Promise<void>;
    refreshSearch: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;
    clearSuggestions: () => void;
}

let suggestionsAbort: AbortController | null = null;
let suggestionsGeneration = 0;

let searchAbort: AbortController | null = null;
let searchGeneration = 0;

export const useSearchStore = create(
    persist<SearchState>(
        (set, get) => ({
            searchQuery: '',
            isKaraoke: false,
            isLoading: false,
            isLoadingMore: false,
            isLoadingSuggestions: false,
            searchResults: [],
            suggestions: [],
            nextToken: null,
            error: null,
            loadMoreFailed: false,

            setSearchQuery: (query) => set({ searchQuery: query }),

            setIsKaraoke: (isKaraoke) => {
                set({ isKaraoke });
                const { searchQuery, performSearch } = get();
                if (searchQuery.trim()) {
                    void performSearch(searchQuery.trim());
                }
            },

            clearSuggestions: () => {
                suggestionsAbort?.abort();
                suggestionsGeneration += 1;
                set({ suggestions: [], isLoadingSuggestions: false });
            },

            performSearch: async (query, token) => {
                const trimmed = query.trim();
                const { isKaraoke } = get();

                if (!trimmed) {
                    searchAbort?.abort();
                    searchGeneration += 1;
                    set({
                        searchQuery: '',
                        searchResults: [],
                        nextToken: null,
                        error: null,
                        loadMoreFailed: false,
                        isLoading: false,
                        isLoadingMore: false,
                    });
                    return;
                }

                set({ searchQuery: trimmed });

                if (!token) {
                    searchAbort?.abort();
                    const controller = new AbortController();
                    searchAbort = controller;
                    const generation = ++searchGeneration;

                    set({
                        isLoading: true,
                        searchResults: [],
                        nextToken: null,
                        error: null,
                        loadMoreFailed: false,
                    });

                    try {
                        const { items, continuation } = await searchYoutube({
                            query: trimmed,
                            isKaraoke,
                            signal: controller.signal,
                        });

                        if (generation !== searchGeneration) return;

                        usePersonalizationStore.getState().recordSearch(trimmed, isKaraoke);

                        set({
                            searchResults: personalizeSearchResults(items, trimmed, isKaraoke),
                            nextToken: continuation,
                        });
                    } catch (err) {
                        if (err instanceof Error && err.name === 'AbortError') return;
                        if (generation !== searchGeneration) return;
                        set({ error: 'Failed to fetch results' });
                        console.error('Search error:', err);
                    } finally {
                        if (generation === searchGeneration) {
                            set({ isLoading: false });
                        }
                    }
                    return;
                }

                set({ isLoadingMore: true, loadMoreFailed: false });

                try {
                    const { items, continuation } = await searchYoutube({
                        query: trimmed,
                        isKaraoke,
                        continuation: token,
                    });

                    set((state) => {
                        const existingIds = new Set(state.searchResults.map((video) => video.id));
                        const newItems = items.filter((video) => !existingIds.has(video.id));

                        return {
                            searchResults: [
                                ...state.searchResults,
                                ...personalizeSearchResults(newItems, trimmed, isKaraoke),
                            ],
                            nextToken: continuation,
                            loadMoreFailed: false,
                        };
                    });
                } catch (err) {
                    console.error('Search error:', err);
                    set({ loadMoreFailed: true });
                } finally {
                    set({ isLoadingMore: false });
                }
            },

            loadMore: async () => {
                const { nextToken, isLoadingMore, searchQuery } = get();
                if (nextToken && !isLoadingMore && searchQuery.trim()) {
                    await get().performSearch(searchQuery, nextToken);
                }
            },

            retryLoadMore: async () => {
                const { loadMoreFailed, isLoadingMore } = get();
                if (!loadMoreFailed || isLoadingMore) return;
                set({ loadMoreFailed: false });
                await get().loadMore();
            },

            refreshSearch: async () => {
                const { searchQuery, isLoading, isLoadingMore } = get();
                const trimmed = searchQuery.trim();
                if (!trimmed || isLoading || isLoadingMore) return;
                await get().performSearch(trimmed);
            },

            fetchSuggestions: async (query) => {
                const trimmed = query.trim();
                const localQueries = getLocalSuggestionQueries();

                suggestionsAbort?.abort();
                const generation = ++suggestionsGeneration;

                if (trimmed.length === 0) {
                    set({
                        suggestions: blendSuggestions(localQueries, [], ''),
                        isLoadingSuggestions: false,
                    });
                    return;
                }

                if (trimmed.length < MIN_SUGGESTION_QUERY_LENGTH) {
                    set({
                        suggestions: blendSuggestions(localQueries, [], trimmed),
                        isLoadingSuggestions: false,
                    });
                    return;
                }

                const controller = new AbortController();
                suggestionsAbort = controller;

                set({ isLoadingSuggestions: true });

                try {
                    const fetchedSuggestions = await getYoutubeSuggestions(trimmed, controller.signal);

                    if (generation !== suggestionsGeneration) return;

                    set({
                        suggestions: blendSuggestions(localQueries, fetchedSuggestions, trimmed),
                    });
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') return;
                    if (generation !== suggestionsGeneration) return;
                    console.error('Error fetching suggestions:', error);
                    set({ suggestions: [] });
                } finally {
                    if (generation === suggestionsGeneration) {
                        set({ isLoadingSuggestions: false });
                    }
                }
            },

        }),
        {
            name: 'search-store',
            storage: createJSONStorage(() => localStorage),
            /** Persist only preferences — never draft query/results (causes input lag). */
            partialize: (state) => ({ isKaraoke: state.isKaraoke }) as SearchState,
        },
    ),
);
