import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createMigratingPersistStorage } from '@/lib/persisted-storage';

import type { YouTubeVideo } from '@vkara/youtube';
import { blendSuggestions } from '@vkara/personalization';
import { getYoutubeSuggestions } from '@/services/youtube-api';
import {
    canLoadMoreSearchPages,
    searchFirstPage,
    searchNextPage,
    supportsSearchSuggestions,
} from '@/lib/search-providers';
import { getPersonalizationProfile, usePersonalizationStore } from '@/store/personalizationStore';
import { useCuratedStore } from '@/store/curatedStore';

const MIN_SUGGESTION_QUERY_LENGTH = 2;

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
    /** TikTok pagination session id from the API; required with nextToken for load more. */
    tiktokSearchId: string | null;
    error: string | null;
    loadMoreFailed: boolean;
    searchOverlayRequestId: number;

    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean, queryOverride?: string) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    retryLoadMore: () => Promise<void>;
    refreshSearch: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;
    clearSuggestions: () => void;
    requestSearchOverlay: () => void;
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
            tiktokSearchId: null,
            error: null,
            loadMoreFailed: false,
            searchOverlayRequestId: 0,

            setSearchQuery: (query) => set({ searchQuery: query }),

            setIsKaraoke: (isKaraoke, queryOverride) => {
                set({ isKaraoke });
                const query = (queryOverride ?? get().searchQuery).trim();
                if (query) {
                    void get().performSearch(query);
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
                        tiktokSearchId: null,
                        error: null,
                        loadMoreFailed: false,
                        isLoading: false,
                        isLoadingMore: false,
                    });
                    return;
                }

                set({ searchQuery: trimmed });
                useCuratedStore.getState().dismissCuratedStarters();

                if (!token) {
                    searchAbort?.abort();
                    const controller = new AbortController();
                    searchAbort = controller;
                    const generation = ++searchGeneration;

                    set({
                        isLoading: true,
                        searchResults: [],
                        nextToken: null,
                        tiktokSearchId: null,
                        error: null,
                        loadMoreFailed: false,
                    });

                    try {
                        const result = await searchFirstPage({
                            query: trimmed,
                            isKaraoke,
                            signal: controller.signal,
                        });

                        if (generation !== searchGeneration) return;

                        usePersonalizationStore.getState().recordSearch(trimmed, isKaraoke);

                        set({
                            searchResults: result.items,
                            nextToken: result.continuation,
                            tiktokSearchId: result.searchId,
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
                    const existingIds = new Set(get().searchResults.map((video) => video.id));
                    const result = await searchNextPage({
                        query: trimmed,
                        isKaraoke,
                        continuation: token,
                        existingIds,
                        tiktokSearchId: get().tiktokSearchId,
                    });

                    set((state) => ({
                        searchResults: [...state.searchResults, ...result.items],
                        nextToken: result.continuation,
                        tiktokSearchId: result.searchId ?? state.tiktokSearchId,
                        loadMoreFailed: false,
                    }));
                } catch (err) {
                    console.error('Search error:', err);
                    set({ loadMoreFailed: true });
                } finally {
                    set({ isLoadingMore: false });
                }
            },

            loadMore: async () => {
                const { nextToken, isLoadingMore, searchQuery, tiktokSearchId } = get();
                if (!nextToken || isLoadingMore || !searchQuery.trim()) {
                    return;
                }
                if (!canLoadMoreSearchPages({ tiktokSearchId })) {
                    return;
                }
                await get().performSearch(searchQuery, nextToken);
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
                if (!supportsSearchSuggestions()) {
                    set({ suggestions: [], isLoadingSuggestions: false });
                    return;
                }

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
                    const fetchedSuggestions = await getYoutubeSuggestions(
                        trimmed,
                        controller.signal,
                    );

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

            requestSearchOverlay: () =>
                set((state) => ({ searchOverlayRequestId: state.searchOverlayRequestId + 1 })),
        }),
        {
            name: 'search-store',
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            /** Persist only preferences — never draft query/results (causes input lag). */
            partialize: (state) => ({ isKaraoke: state.isKaraoke }) as SearchState,
        },
    ),
);
