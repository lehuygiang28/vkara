import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { YouTubePlayer } from 'react-youtube';
import { YouTubeVideo } from '@/types/youtube.type';
import { Room, ServerMessage } from '@/types/websocket.type';

interface YouTubeState {
    player: YouTubePlayer | null;
    isMuted: boolean;
    isKaraoke: boolean;
    searchQuery: string;
    volume: number;
    selectedVideo: string | null;
    currentTab: string;
    room: Room | null;
    currentVideo: string | null;
    searchResults: YouTubeVideo[];
    isLoading: boolean;
    error: string | null;

    setPlayer: (player: YouTubePlayer) => void;
    setIsMuted: (isMuted: boolean) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSearchQuery: (searchQuery: string) => void;
    setVolume: (volume: number) => void;
    setSelectedVideo: (selectedVideo: string | null) => void;
    setCurrentTab: (currentTab: string) => void;
    setRoom: (room: Room | null) => void;
    setCurrentVideo: (currentVideo: string | null) => void;
    setSearchResults: (searchResults: YouTubeVideo[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    addVideo: (video: YouTubeVideo) => void;
    removeVideo: (videoId: string) => void;
    playNow: (video: YouTubeVideo) => void;
    nextVideo: () => void;
    setIsPlaying: (isPlaying: boolean) => void;
    handleServerMessage: (message: ServerMessage) => void;
}

export const useYouTubeStore = create(
    persist<YouTubeState>(
        (set) => ({
            player: null,
            isMuted: false,
            isKaraoke: false,
            searchQuery: '',
            volume: 60,
            selectedVideo: null,
            currentTab: 'search',
            room: null,
            currentVideo: null,
            searchResults: [],
            isLoading: false,
            error: null,

            setPlayer: (player) => set({ player }),
            setIsMuted: (isMuted) => set({ isMuted }),
            setIsKaraoke: (isKaraoke) => set({ isKaraoke }),
            setSearchQuery: (searchQuery) => set({ searchQuery }),
            setVolume: (volume) => set({ volume }),
            setSelectedVideo: (selectedVideo) => set({ selectedVideo }),
            setCurrentTab: (currentTab) => set({ currentTab }),
            setRoom: (room) => set({ room }),
            setCurrentVideo: (currentVideo) => set({ currentVideo }),
            setSearchResults: (searchResults) => set({ searchResults }),
            setIsLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),

            addVideo: (video) =>
                set((state) => ({
                    room: state.room
                        ? {
                              ...state.room,
                              videoQueue: [...state.room.videoQueue, video],
                          }
                        : null,
                })),

            removeVideo: (videoId) =>
                set((state) => ({
                    room: state.room
                        ? {
                              ...state.room,
                              videoQueue: state.room.videoQueue.filter(
                                  (v) => v.id.videoId !== videoId,
                              ),
                          }
                        : null,
                })),

            playNow: (video) =>
                set((state) => ({
                    room: state.room
                        ? {
                              ...state.room,
                              playingNow: video,
                              isPlaying: true,
                              currentTime: 0,
                              videoQueue: state.room.videoQueue.filter(
                                  (v) => v.id.videoId !== video.id.videoId,
                              ),
                              historyQueue: state.room.playingNow
                                  ? [state.room.playingNow, ...state.room.historyQueue]
                                  : state.room.historyQueue,
                          }
                        : null,
                })),

            nextVideo: () =>
                set((state) => {
                    if (!state.room) return { room: null };
                    const nextVideo = state.room.videoQueue[0];
                    return {
                        room: {
                            ...state.room,
                            playingNow: nextVideo || null,
                            isPlaying: Boolean(nextVideo),
                            currentTime: 0,
                            videoQueue: state.room.videoQueue.slice(1),
                            historyQueue: state.room.playingNow
                                ? [state.room.playingNow, ...state.room.historyQueue]
                                : state.room.historyQueue,
                        },
                    };
                }),

            setIsPlaying: (isPlaying) =>
                set((state) => ({
                    room: state.room ? { ...state.room, isPlaying } : null,
                })),

            handleServerMessage: (message) => {
                switch (message.type) {
                    case 'roomUpdate':
                        set({ room: message.room });
                        break;
                    case 'roomClosed':
                        set({ room: null });
                        break;
                    default:
                        break;
                }
            },
        }),
        { name: 'youtube-storage', storage: createJSONStorage(() => localStorage) },
    ),
);
