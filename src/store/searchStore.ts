import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { YouTubeVideo } from '@/types/youtube.type';
import {
    checkEmbeddableStatus,
    getYoutubeSuggestions,
    searchYoutube,
} from '@/services/youtube-api';

interface SearchState {
    searchQuery: string;
    isKaraoke: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    isLoadingSuggestions: boolean;
    isProcessingBatch: boolean;
    searchResults: YouTubeVideo[];
    pendingResults: YouTubeVideo[];
    suggestions: string[];
    selectedVideoId: string | null;
    nextToken: string | null;
    error: string | null;

    // Actions
    setSearchQuery: (query: string) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSelectedVideoId: (id: string | null) => void;
    performSearch: (query: string, token?: string | null) => Promise<void>;
    loadMore: () => Promise<void>;
    processNextBatch: () => Promise<void>;
    fetchSuggestions: (query: string) => Promise<void>;
}

const BATCH_SIZE = 25;

export const useSearchStore = create(
    persist<SearchState>(
        (set, get) => ({
            searchQuery: '',
            isKaraoke: false,
            isLoading: false,
            isLoadingMore: false,
            isLoadingSuggestions: false,
            isProcessingBatch: false,
            searchResults: [],
            pendingResults: [],
            suggestions: [],
            selectedVideoId: null,
            nextToken: null,
            error: null,

            setSearchQuery: (query) => set({ searchQuery: query }),
            setIsKaraoke: (isKaraoke) => set({ isKaraoke }),
            setSelectedVideoId: (id) => set({ selectedVideoId: id }),

            performSearch: async (query, token) => {
                const { isKaraoke } = get();

                if (!query) {
                    set({
                        pendingResults: [],
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
                        pendingResults: [],
                        nextToken: null,
                        error: null,
                        selectedVideoId: null, // Also clear selected video
                        isProcessingBatch: false, // Reset processing state
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
                        // For new searches (no token), just set the new items
                        if (!token) {
                            return {
                                pendingResults: items,
                                nextToken: continuation,
                            };
                        }

                        // For loading more, append to existing results
                        const existingIds = state.searchResults.map((v) => v.id);
                        const newVideos = items.filter((v) => !existingIds.includes(v.id));

                        return {
                            pendingResults: [...state.pendingResults, ...newVideos],
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
                const { nextToken, isLoadingMore, isProcessingBatch, searchQuery } = get();
                if (nextToken && !isLoadingMore && !isProcessingBatch) {
                    await get().performSearch(searchQuery, nextToken);
                }
            },

            processNextBatch: async () => {
                const { isProcessingBatch, pendingResults } = get();

                if (isProcessingBatch || pendingResults.length === 0) return;

                set({ isProcessingBatch: true });
                const batch = pendingResults.slice(0, BATCH_SIZE);
                const videoIds = batch.map((video) => video.id);

                try {
                    let processedBatch;
                    if (process.env.NEXT_PUBLIC_SKIP_EMBEDDABLE_CHECK === 'true') {
                        processedBatch = batch.map((video) => ({
                            ...video,
                            isEmbedChecked: true,
                            canEmbed: true,
                        }));
                    } else {
                        const embedResults = await checkEmbeddableStatus(videoIds);
                        processedBatch = batch.map((video) => ({
                            ...video,
                            isEmbedChecked: true,
                            canEmbed:
                                embedResults.find((result) => result.videoId === video.id)
                                    ?.canEmbed || false,
                        }));
                    }

                    set((state) => {
                        const existingIds = state.searchResults.map((v) => v.id);
                        const newVideos = processedBatch.filter((v) => !existingIds.includes(v.id));
                        return {
                            pendingResults: state.pendingResults.slice(BATCH_SIZE),
                            searchResults: [
                                ...state.searchResults,
                                ...newVideos.filter((video) => video.canEmbed),
                            ],
                        };
                    });
                } catch (error) {
                    console.error('Error processing batch:', error);
                } finally {
                    set({ isProcessingBatch: false });
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
        }),
        {
            name: 'search-store',
            storage: createJSONStorage(() => localStorage),
        },
    ),
);
