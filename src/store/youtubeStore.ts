import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { YouTubeVideo } from '@/types/youtube.type';
import { Room, ServerMessage } from '@/types/websocket.type';
import { ErrorCode } from '@/types/server-errors.type';
import { toast } from '@/hooks/use-toast';
import { useScopedI18n } from '@/locales/client';

interface YouTubeState {
    wsId: string | null;
    player: YT.Player | null;
    volume: number;
    currentTab: string;
    room: Omit<Room, 'clients'> | null;
    isLoading: boolean;
    error: string | null;
    layoutMode: 'both' | 'remote' | 'player';
    showQRInPlayer: boolean;
    showBottomControls: boolean;
    opacityOfButtonsInPlayer: number;

    setWsId: (wsId: string | null) => void;
    setPlayer: (player: YT.Player) => void;
    setVolume: (volume: number) => void;
    setCurrentTab: (currentTab: string) => void;
    setRoom: (room: Omit<Room, 'clients'> | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setLayoutMode: (mode: 'both' | 'remote' | 'player') => void;
    setShowQRInPlayer: (show: boolean) => void;
    setShowBottomControls: (show: boolean) => void;
    setOpacityOfButtonsInPlayer: (opacity: number) => void;

    addVideo: (video: YouTubeVideo) => void;
    removeVideo: (videoId: string) => void;
    playNow: (video: YouTubeVideo) => void;
    nextVideo: () => void;
    setIsPlaying: (isPlaying: boolean) => void;
    handleServerMessage: (message: ServerMessage, t: ReturnType<typeof useScopedI18n>) => void;
}

export const useYouTubeStore = create(
    persist<YouTubeState>(
        (set) => ({
            wsId: null,
            player: null,
            volume: 60,
            currentTab: 'search',
            room: null,
            isLoading: false,
            error: null,
            layoutMode: 'both',
            showQRInPlayer: true,
            showBottomControls: true,
            opacityOfButtonsInPlayer: 50,

            setWsId: (wsId) => set({ wsId }),
            setPlayer: (player) => set({ player }),
            setVolume: (volume) => set({ volume }),
            setCurrentTab: (currentTab) => set({ currentTab }),
            setRoom: (room) => set({ room }),
            setIsLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setLayoutMode: (layoutMode) => {
                if (layoutMode === 'remote') {
                    return set({ layoutMode: 'remote', player: null });
                }
                return set({ layoutMode });
            },
            setShowQRInPlayer: (show) => set({ showQRInPlayer: show }),
            setShowBottomControls: (show) => set({ showBottomControls: show }),
            setOpacityOfButtonsInPlayer: (opacity) => {
                const MIN_OPACITY = 0;
                const MAX_OPACITY = 100;

                const adjustedOpacity = Math.round(opacity / 5) * 5;

                if (adjustedOpacity < MIN_OPACITY) {
                    set({ opacityOfButtonsInPlayer: MIN_OPACITY });
                } else if (adjustedOpacity > MAX_OPACITY) {
                    set({ opacityOfButtonsInPlayer: MAX_OPACITY });
                } else {
                    set({ opacityOfButtonsInPlayer: adjustedOpacity });
                }
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

            handleServerMessage: (message, t) => {
                switch (message.type) {
                    case 'roomJoined':
                        set({ room: message.room, wsId: message.yourId });
                        break;
                    case 'roomUpdate':
                        set({ room: message.room });
                        break;
                    case 'leftRoom':
                        set({ room: null });
                        break;
                    case 'roomClosed':
                        set({ room: null });
                        toast({
                            title: t('roomClosed'),
                            description: t('roomClosedDescription'),
                            variant: 'destructive',
                        });
                        break;
                    case 'roomNotFound':
                        set({ room: null });
                        toast({
                            title: t('roomNotFound'),
                            description: t('roomNotFoundDescription'),
                            variant: 'destructive',
                        });
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
                                    toast({
                                        title: t('roomNotFound'),
                                        description: t('roomNotFoundDescription'),
                                        variant: 'destructive',
                                    });
                                    break;
                                case ErrorCode.INCORRECT_PASSWORD:
                                    toast({
                                        title: t('incorrectPassword'),
                                        description: t('incorrectPasswordDescription'),
                                        variant: 'destructive',
                                    });
                                    break;
                                default:
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
