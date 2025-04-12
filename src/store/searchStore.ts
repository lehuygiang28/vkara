import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { YouTubeVideo } from '@/types/youtube.type';
// import { getRelatedVideos } from '@/actions/youtube-actions';
import { getYoutubeSuggestions, searchYoutube, getRelatedVideos } from '@/services/youtube-api';
import { useYouTubeStore } from '@/store/youtubeStore';

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

    // Actions
    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSelectedVideoId: (id: string | null) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;

    fetchRelatedResults: (videoId: string, token?: string | null) => Promise<void>;
    loadMoreRelated: () => Promise<void>;
    setSelectedRelatedVideoId: (id: string | null) => void;
}

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
                if (searchQuery) {
                    performSearch(searchQuery);
                }
            },
            setSelectedVideoId: (id) => set({ selectedVideoId: id }),

            performSearch: async (query, token) => {
                const { isKaraoke } = get();

                if (!query) {
                    set({
                        searchResults: [],
                        nextToken: null,
                        error: null,
                    });
                    return;
                }

                const searchTerm = `${isKaraoke ? 'karaoke ' : ''}${query}`;

                // Clear everything when starting a new search (no token)
                set({ selectedVideoId: null });
                if (!token) {
                    set({
                        isLoading: true,
                        searchResults: [],
                        nextToken: null,
                        error: null,
                    });
                } else {
                    set({ isLoadingMore: true });
                }

                try {
                    const { items, continuation } = await searchYoutube({
                        query: searchTerm,
                        isKaraoke,
                        continuation: token,
                    });

                    set((state) => {
                        if (!token) {
                            return {
                                searchResults: items,
                                nextToken: continuation,
                            };
                        }

                        const existingIds = new Set(state.searchResults.map((video) => video.id));
                        const newItems = items.filter((video) => !existingIds.has(video.id));

                        return {
                            searchResults: [...state.searchResults, ...newItems],
                            nextToken: continuation,
                        };
                    });
                } catch (err) {
                    set({ error: 'Failed to fetch results' });
                    console.error('Search error:', err);
                } finally {
                    set({
                        isLoading: false,
                        isLoadingMore: false,
                    });
                }
            },

            loadMore: async () => {
                const { nextToken, isLoadingMore, searchQuery } = get();
                if (nextToken && !isLoadingMore) {
                    await get().performSearch(searchQuery, nextToken);
                }
            },

            fetchSuggestions: async (query) => {
                if (!query) {
                    set({ suggestions: [] });
                    return;
                }

                set({ isLoadingSuggestions: true });
                try {
                    const fetchedSuggestions = await getYoutubeSuggestions(query);
                    set({ suggestions: fetchedSuggestions });
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    set({ suggestions: [] });
                } finally {
                    set({ isLoadingSuggestions: false });
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
        },
    ),
);
