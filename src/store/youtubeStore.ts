import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { YouTubeVideo } from '@/types/youtube.type';
import { Room, ServerMessage } from '@/types/websocket.type';
import { ErrorCode } from '@/types/server-errors.type';

interface YouTubeState {
    wsId: string | null;
    player: YT.Player | null;
    isKaraoke: boolean;
    searchQuery: string;
    volume: number;
    currentTab: string;
    room: Room | null;
    currentVideo: string | null;
    searchResults: YouTubeVideo[];
    isLoading: boolean;
    error: string | null;
    layoutMode: 'both' | 'remote' | 'player';

    setWsId: (wsId: string | null) => void;
    setPlayer: (player: YT.Player) => void;
    setIsKaraoke: (isKaraoke: boolean) => void;
    setSearchQuery: (searchQuery: string) => void;
    setVolume: (volume: number) => void;
    setCurrentTab: (currentTab: string) => void;
    setRoom: (room: Room | null) => void;
    setCurrentVideo: (currentVideo: string | null) => void;
    setSearchResults: (searchResults: YouTubeVideo[]) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setLayoutMode: (mode: 'both' | 'remote' | 'player') => void;

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
            wsId: null,
            player: null,
            isKaraoke: false,
            searchQuery: '',
            volume: 60,
            currentTab: 'search',
            room: null,
            currentVideo: null,
            searchResults: [],
            isLoading: false,
            error: null,
            layoutMode: 'both',

            setWsId: (wsId) => set({ wsId }),
            setPlayer: (player) => set({ player }),
            setIsKaraoke: (isKaraoke) => set({ isKaraoke }),
            setSearchQuery: (searchQuery) => set({ searchQuery }),
            setVolume: (volume) => set({ volume }),
            setCurrentTab: (currentTab) => set({ currentTab }),
            setRoom: (room) => set({ room }),
            setCurrentVideo: (currentVideo) => set({ currentVideo }),
            setSearchResults: (searchResults) => set({ searchResults }),
            setIsLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setLayoutMode: (layoutMode) => {
                if (layoutMode === 'remote') {
                    return set({ layoutMode: 'remote', player: null });
                }
                return set({ layoutMode });
            },

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
                              videoQueue: state.room.videoQueue.filter((v) => v.id !== videoId),
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
                              videoQueue: state.room.videoQueue.filter((v) => v.id !== video.id),
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
                    case 'roomJoined':
                        set({ room: message.room, wsId: message.yourId });
                        break;
                    case 'roomUpdate':
                        set({ room: message.room });
                        break;
                    case 'roomClosed':
                        set({ room: null });
                        break;
                    case 'roomNotFound':
                        set({ room: null });
                        break;
                    case 'currentTimeChanged':
                        {
                            set((state) => {
                                state?.player?.seekTo(message.currentTime, true);
                                return state;
                            });
                        }
                        break;
                    case 'volumeChanged':
                        {
                            set((state) => {
                                // Ensure volume is between 0 and 100
                                const volume = Math.min(100, Math.max(0, message.volume));
                                state?.player?.setVolume(volume);
                                return { ...state, volume };
                            });
                        }
                        break;
                    case 'replay':
                        {
                            set((state) => {
                                state?.player?.seekTo(0, true);
                                return state;
                            });
                        }
                        break;
                    case 'play':
                        {
                            set((state) => {
                                state?.player?.playVideo();
                                return state;
                            });
                        }
                        break;
                    case 'pause':
                        {
                            set((state) => {
                                state?.player?.pauseVideo();
                                return state;
                            });
                        }
                        break;
                    case 'errorWithCode':
                        {
                            switch (message.code) {
                                case ErrorCode.ROOM_NOT_FOUND:
                                case ErrorCode.NOT_IN_ROOM:
                                    set({ room: null });
                                    break;
                            }
                        }
                        break;
                    default:
                        break;
                }
            },
        }),
        {
            name: 'youtube-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { player, ...rest } = state;
                return { ...rest, player: null };
            },
        },
    ),
);
