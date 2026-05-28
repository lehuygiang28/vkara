import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { YouTubeVideo } from '@/types/youtube.type';
import { getYoutubeSuggestions, searchYoutube, getRelatedVideos } from '@/services/youtube-api';
import { useYouTubeStore } from '@/store/youtubeStore';

const MIN_SUGGESTION_QUERY_LENGTH = 2;

interface SearchState {
    searchQuery: string;
    isKaraoke: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isLoadingSuggestions: boolean;
    searchResults: YouTubeVideo[];
    suggestions: string[];
    selectedVideoId: string | null;
    nextToken: string | null;
    error: string | null;

    relatedResults: YouTubeVideo[];
    isRelatedLoading: boolean;
    isRelatedLoadingMore: boolean;
    selectedRelatedVideoId: string | null;
    relatedNextToken: string | null;

    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSelectedVideoId: (id: string | null) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;
    clearSuggestions: () => void;

    fetchRelatedResults: (videoId: string, token?: string | null) => Promise<void>;
    loadMoreRelated: () => Promise<void>;
    setSelectedRelatedVideoId: (id: string | null) => void;
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
            selectedVideoId: null,
            nextToken: null,
            error: null,

            relatedResults: [],
            isRelatedLoading: false,
            isRelatedLoadingMore: false,
            selectedRelatedVideoId: null,
            relatedNextToken: null,

            setSearchQuery: (query) => set({ searchQuery: query }),

            setIsKaraoke: (isKaraoke) => {
                set({ isKaraoke });
                const { searchQuery, performSearch } = get();
                if (searchQuery.trim()) {
                    void performSearch(searchQuery.trim());
                }
            },

            setSelectedVideoId: (id) => set({ selectedVideoId: id }),

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
                        isLoading: false,
                        isLoadingMore: false,
                    });
                    return;
                }

                set({ searchQuery: trimmed, selectedVideoId: null });

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
                    });

                    try {
                        const { items, continuation } = await searchYoutube({
                            query: trimmed,
                            isKaraoke,
                            signal: controller.signal,
                        });

                        if (generation !== searchGeneration) return;

                        set({
                            searchResults: items,
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

                set({ isLoadingMore: true });

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
                            searchResults: [...state.searchResults, ...newItems],
                            nextToken: continuation,
                        };
                    });
                } catch (err) {
                    console.error('Search error:', err);
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

            fetchSuggestions: async (query) => {
                const trimmed = query.trim();

                suggestionsAbort?.abort();
                const generation = ++suggestionsGeneration;

                if (trimmed.length < MIN_SUGGESTION_QUERY_LENGTH) {
                    set({ suggestions: [], isLoadingSuggestions: false });
                    return;
                }

                const controller = new AbortController();
                suggestionsAbort = controller;

                set({ isLoadingSuggestions: true });

                try {
                    const fetchedSuggestions = await getYoutubeSuggestions(trimmed, controller.signal);

                    if (generation !== suggestionsGeneration) return;

                    set({ suggestions: fetchedSuggestions });
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

            fetchRelatedResults: async (videoId: string, token?: string | null) => {
                if (!token) {
                    set({
                        isRelatedLoading: true,
                        relatedResults: [],
                        selectedRelatedVideoId: null,
                        relatedNextToken: null,
                    });
                } else {
                    set({ isRelatedLoadingMore: true });
                }

                try {
                    const { items, continuation } = await getRelatedVideos(videoId, token);

                    set((state) => {
                        if (!token) {
                            return {
                                relatedResults: items,
                                relatedNextToken: continuation,
                            };
                        }

                        const existingIds = new Set(state.relatedResults.map((video) => video.id));
                        const newItems = items.filter((video) => !existingIds.has(video.id));

                        return {
                            relatedResults: [...state.relatedResults, ...newItems],
                            relatedNextToken: continuation,
                        };
                    });
                } catch (error) {
                    console.error('Error fetching related results:', error);
                } finally {
                    set({
                        isRelatedLoading: false,
                        isRelatedLoadingMore: false,
                    });
                }
            },

            loadMoreRelated: async () => {
                const { relatedNextToken, isRelatedLoadingMore } = get();
                const youtubeStore = useYouTubeStore.getState();
                const currentVideoId = youtubeStore.room?.playingNow?.id;

                if (currentVideoId && relatedNextToken && !isRelatedLoadingMore) {
                    await get().fetchRelatedResults(currentVideoId, relatedNextToken);
                }
            },

            setSelectedRelatedVideoId: (id) => set({ selectedRelatedVideoId: id }),
        }),
        {
            name: 'search-store',
            storage: createJSONStorage(() => localStorage),
            /** Persist only preferences — never draft query/results (causes input lag). */
            partialize: (state) => ({ isKaraoke: state.isKaraoke }) as SearchState,
        },
    ),
);
