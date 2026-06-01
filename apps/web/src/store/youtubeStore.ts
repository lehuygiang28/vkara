import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    ErrorCode,
    normalizePersistedRoom,
    PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC,
    type Room,
    type ServerMessage,
    type YouTubeVideo,
} from '@vkara/shared-types';
import { createMigratingPersistStorage } from '@/lib/persisted-storage';
import { toast } from '@/hooks/use-toast';
import type { useScopedI18n } from '@/locales/client';
import { cancelPendingQueueAdd, confirmPendingQueueAdd } from '@/lib/queue-action-feedback';
import {
    isYoutubeActivelyPlaying,
    isYoutubeExplicitlyPaused,
    markServerPlaybackCommand,
} from '@/lib/youtube-playback-sync';

export type YouTubeStoreLayoutMode = 'both' | 'remote' | 'player';
export type LayoutModeSource = 'auto' | 'url' | 'user';

interface YouTubeState {
    wsId: string | null;
    player: YT.Player | null;
    volume: number;
    currentTab: string;
    room: Omit<Room, 'clients'> | null;
    isLoading: boolean;
    error: string | null;
    layoutMode: YouTubeStoreLayoutMode;
    layoutModeSource: LayoutModeSource;

    setWsId: (wsId: string | null) => void;
    setPlayer: (player: YT.Player) => void;
    setVolume: (volume: number) => void;
    setCurrentTab: (currentTab: string) => void;
    setRoom: (room: Omit<Room, 'clients'> | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setLayoutMode: (mode: YouTubeStoreLayoutMode, source?: LayoutModeSource) => void;
    enableAutoLayoutMode: () => void;
    applyAutoLayoutMode: (suggested: YouTubeStoreLayoutMode) => void;

    addVideo: (video: YouTubeVideo) => void;
    removeVideo: (videoId: string) => void;
    playNow: (video: YouTubeVideo) => void;
    nextVideo: () => void;
    setIsPlaying: (isPlaying: boolean) => void;
    handleServerMessage: (
        message: ServerMessage,
        t: ReturnType<typeof useScopedI18n>,
        options?: { isTvLayout?: boolean },
    ) => void;
}

export const useYouTubeStore = create(
    persist<YouTubeState>(
        (set) => ({
            wsId: null,
            player: null,
            volume: 100,
            currentTab: 'search',
            room: null,
            isLoading: false,
            error: null,
            layoutMode: 'remote',
            layoutModeSource: 'auto',

            setWsId: (wsId) => set({ wsId }),
            setPlayer: (player) => set({ player }),
            setVolume: (volume) => set({ volume }),
            setCurrentTab: (currentTab) => set({ currentTab }),
            setRoom: (room) =>
                set({ room: room ? normalizePersistedRoom(room) : null }),
            setIsLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setLayoutMode: (layoutMode, source = 'user') => {
                if (layoutMode === 'remote') {
                    return set({ layoutMode: 'remote', layoutModeSource: source, player: null });
                }
                return set({ layoutMode, layoutModeSource: source });
            },
            enableAutoLayoutMode: () => set({ layoutModeSource: 'auto' }),
            applyAutoLayoutMode: (suggested) =>
                set((state) => {
                    if (state.layoutModeSource !== 'auto') {
                        return state;
                    }
                    if (suggested === 'remote') {
                        return { layoutMode: 'remote', player: null };
                    }
                    return { layoutMode: suggested };
                }),

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

            handleServerMessage: (message, t, options) => {
                const isTvLayout = options?.isTvLayout ?? false;

                switch (message.type) {
                    case 'roomJoined': {
                        const joinedRoom = normalizePersistedRoom(message.room);
                        const roomVolume = Math.min(
                            100,
                            Math.max(0, joinedRoom?.volume ?? 100),
                        );
                        set((state) => {
                            state?.player?.setVolume(roomVolume);
                            return {
                                room: joinedRoom,
                                wsId: message.yourId,
                                volume: roomVolume,
                            };
                        });
                        break;
                    }
                    case 'roomUpdate':
                        set((state) => {
                            const updatedRoom = normalizePersistedRoom(message.room);
                            confirmPendingQueueAdd(state.room, updatedRoom);
                            return { room: updatedRoom };
                        });
                        break;
                    case 'leftRoom':
                        set({ room: null });
                        break;
                    case 'roomClosed':
                        if (!isTvLayout) {
                            toast({
                                id: 'room-closed',
                                title: t('roomClosed'),
                                description: t('roomClosedDescription'),
                                variant: 'error',
                            });
                        }
                        break;
                    case 'roomNotFound':
                        set({ room: null });
                        if (!isTvLayout) {
                            toast({
                                id: 'room-not-found',
                                title: t('roomNotFound'),
                                description: t('roomNotFoundDescription'),
                                variant: 'error',
                            });
                        }
                        break;
                    case 'currentTimeChanged':
                        {
                            set((state) => {
                                const player = state.player;
                                if (player) {
                                    const playerSeconds = Math.floor(player.getCurrentTime());
                                    const drift = Math.abs(playerSeconds - message.currentTime);
                                    if (drift > PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC) {
                                        player.seekTo(message.currentTime, true);
                                    }
                                }
                                return {
                                    ...state,
                                    room: state.room
                                        ? { ...state.room, currentTime: message.currentTime }
                                        : null,
                                };
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
                                return {
                                    ...state,
                                    room: state.room
                                        ? {
                                              ...state.room,
                                              isPlaying: true,
                                              currentTime: 0,
                                          }
                                        : null,
                                };
                            });
                        }
                        break;
                    case 'play':
                        {
                            set((state) => {
                                const playerState = state.player?.getPlayerState();
                                if (
                                    playerState === undefined ||
                                    !isYoutubeActivelyPlaying(playerState)
                                ) {
                                    markServerPlaybackCommand();
                                    state.player?.playVideo();
                                }
                                return {
                                    ...state,
                                    room: state.room ? { ...state.room, isPlaying: true } : null,
                                };
                            });
                        }
                        break;
                    case 'pause':
                        {
                            set((state) => {
                                const playerState = state.player?.getPlayerState();
                                if (
                                    playerState === undefined ||
                                    !isYoutubeExplicitlyPaused(playerState)
                                ) {
                                    markServerPlaybackCommand();
                                    state.player?.pauseVideo();
                                }
                                return {
                                    ...state,
                                    room: state.room ? { ...state.room, isPlaying: false } : null,
                                };
                            });
                        }
                        break;
                    case 'errorWithCode':
                        {
                            switch (message.code) {
                                case ErrorCode.ROOM_NOT_FOUND:
                                    set({ room: null });
                                    if (!isTvLayout) {
                                        toast({
                                            id: 'room-not-found',
                                            title: t('roomNotFound'),
                                            description: t('roomNotFoundDescription'),
                                            variant: 'error',
                                        });
                                    }
                                    break;
                                case ErrorCode.NOT_IN_ROOM:
                                    // Auto rejoin in WebSocketProvider — no toast (ConnectionStatusToast when WS is down).
                                    break;
                                case ErrorCode.INCORRECT_PASSWORD:
                                    toast({
                                        id: 'incorrect-password',
                                        title: t('incorrectPassword'),
                                        description: t('incorrectPasswordDescription'),
                                        variant: 'error',
                                    });
                                    break;
                                case ErrorCode.ALREADY_IN_QUEUE:
                                    cancelPendingQueueAdd({ dismissVisible: true });
                                    toast({
                                        id: 'already-in-queue',
                                        title: t('alreadyInQueue'),
                                        description: t('alreadyInQueueDescription'),
                                        variant: 'warning',
                                    });
                                    break;
                                case ErrorCode.VIDEO_NOT_EMBEDDABLE:
                                    cancelPendingQueueAdd({ dismissVisible: true });
                                    toast({
                                        id: 'video-not-embeddable',
                                        title: t('videoNotEmbeddable'),
                                        description: t('videoNotEmbeddableDescription'),
                                        variant: 'error',
                                    });
                                    break;
                                case ErrorCode.REJOIN_ROOM_NOT_FOUND:
                                    if (!isTvLayout) {
                                        toast({
                                            id: 'room-not-found',
                                            title: t('roomNotFound'),
                                            description: t('roomNotFoundDescription'),
                                            variant: 'error',
                                        });
                                    }
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
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { player, layoutMode, ...rest } = state;
                // Auto mode is re-derived from viewport on load; persisting layoutMode causes remote→TV flicker.
                if (state.layoutModeSource === 'auto') {
                    return { ...rest, player: null, layoutMode: state.layoutMode };
                }
                return { ...rest, player: null, layoutMode };
            },
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<YouTubeState>;
                const room = persisted.room
                    ? normalizePersistedRoom(persisted.room)
                    : null;
                const layoutModeSource = persisted.layoutModeSource ?? 'auto';
                const merged = { ...currentState, ...persisted, room, player: null, layoutModeSource };

                if (layoutModeSource === 'auto') {
                    return {
                        ...merged,
                        layoutMode: currentState.layoutMode,
                    };
                }
                return merged;
            },
        },
    ),
);
