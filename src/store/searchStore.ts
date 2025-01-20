import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { YouTubeVideo } from '@/types/youtube.type';
// import { getRelatedVideos } from '@/actions/youtube-actions';
import { getYoutubeSuggestions, searchYoutube, getRelatedVideos } from '@/services/youtube-api';

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
    selectedRelatedVideoId: string | null;

    // Actions
    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSelectedVideoId: (id: string | null) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;

    fetchRelatedResults: (videoId: string) => void;
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
            selectedRelatedVideoId: null,

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
                if (!token) {
                    set({
                        isLoading: true,
                        searchResults: [],
                        nextToken: null,
                        error: null,
                        selectedVideoId: null,
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

                        const existingIds = state.searchResults.map((video) => video.id);
                        const newItems = items.filter((video) => !existingIds.includes(video.id));

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

            fetchRelatedResults: async (videoId: string) => {
                set({ isRelatedLoading: true });
                try {
                    const oldResults = get().relatedResults;
                    const relatedResults = (await getRelatedVideos(videoId)).items.filter(
                        (video) => !oldResults.some((v) => v.id === video.id),
                    );
                    set({ relatedResults: relatedResults });
                } catch (error) {
                    console.error('Error fetching related results:', error);
                    set({ relatedResults: [] });
                } finally {
                    set({ isRelatedLoading: false });
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
