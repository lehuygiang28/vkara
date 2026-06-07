import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { YouTubeVideo } from '@vkara/youtube';
import {
    ErrorCode,
    normalizePersistedRoom,
    needsPlaybackSeekCorrection,
    type Room,
    type ServerMessage,
} from '@vkara/room';
import { createMigratingPersistStorage } from '@/lib/persisted-storage';
import { useCuratedStore } from '@/store/curatedStore';
import { toast } from '@/hooks/use-toast';
import type { useScopedI18n } from '@/locales/client';
import { cancelPendingQueueAdd, confirmPendingQueueAdd } from '@/lib/queue-action-feedback';
import {
    applyRoomPlaybackToPlayer,
    clearPlaybackBroadcastSuppression,
    markServerPlaybackCommand,
    markPlaybackTrackChange,
    shouldApplyRemoteCurrentTime,
} from '@/lib/youtube-playback-sync';
import { shouldApplyRemoteVolumeChange } from '@/lib/remote-gesture-sync';

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
    /** When true, TV mode skips auto createRoom and shows the lobby instead. */
    tvSuppressAutoCreate: boolean;

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
    enterTvLobby: () => void;

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
            tvSuppressAutoCreate: false,

            setWsId: (wsId) => set({ wsId }),
            setPlayer: (player) => set({ player }),
            setVolume: (volume) => set({ volume }),
            setCurrentTab: (currentTab) => {
                set({ currentTab });
                const curated = useCuratedStore.getState();
                curated.setImportPlaylistPanelOpen(false);
                curated.closeCuratedPreview({ restoreReturnTo: false });
            },
            setRoom: (room) =>
                set({
                    room: room ? normalizePersistedRoom(room) : null,
                    ...(room ? {} : { player: null }),
                }),
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
            enterTvLobby: () => set({ room: null, player: null, tvSuppressAutoCreate: true }),

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
                        const roomVolume = Math.min(100, Math.max(0, joinedRoom?.volume ?? 100));
                        set((state) => {
                            state?.player?.setVolume(roomVolume);
                            if (state.player && joinedRoom?.playingNow) {
                                applyRoomPlaybackToPlayer(
                                    state.player,
                                    joinedRoom.isPlaying ?? false,
                                );
                            }
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
                            const prevPlayingId = state.room?.playingNow?.id ?? null;
                            const nextPlayingId = updatedRoom?.playingNow?.id ?? null;
                            const prevPlaying = state.room?.isPlaying;
                            const nextPlaying = updatedRoom?.isPlaying;
                            if (prevPlayingId !== nextPlayingId) {
                                markPlaybackTrackChange();
                            }
                            if (
                                state.player &&
                                updatedRoom?.playingNow &&
                                prevPlayingId === nextPlayingId &&
                                prevPlaying !== nextPlaying
                            ) {
                                applyRoomPlaybackToPlayer(state.player, nextPlaying ?? false);
                            }
                            confirmPendingQueueAdd(state.room, updatedRoom);
                            return { room: updatedRoom };
                        });
                        break;
                    case 'leftRoom':
                        set((state) => ({
                            room: null,
                            player: null,
                            tvSuppressAutoCreate:
                                state.tvSuppressAutoCreate || Boolean(options?.isTvLayout),
                        }));
                        break;
                    case 'roomClosed':
                        set((state) => ({
                            room: null,
                            player: null,
                            tvSuppressAutoCreate:
                                state.tvSuppressAutoCreate || Boolean(options?.isTvLayout),
                        }));
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
                                const roomTime = state.room?.currentTime ?? 0;
                                const activeVideoId = state.room?.playingNow?.id ?? null;
                                const context = {
                                    videoId: message.videoId,
                                    activeVideoId,
                                };
                                if (
                                    !shouldApplyRemoteCurrentTime(
                                        message.currentTime,
                                        roomTime,
                                        context,
                                    )
                                ) {
                                    if (
                                        context.videoId != null &&
                                        activeVideoId != null &&
                                        context.videoId !== activeVideoId
                                    ) {
                                        clearPlaybackBroadcastSuppression();
                                    }
                                    return state;
                                }

                                const player = state.player;
                                if (
                                    player &&
                                    needsPlaybackSeekCorrection(
                                        player.getCurrentTime(),
                                        message.currentTime,
                                    )
                                ) {
                                    markServerPlaybackCommand();
                                    player.seekTo(message.currentTime, true);
                                }
                                clearPlaybackBroadcastSuppression();
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
                            const volume = Math.min(100, Math.max(0, message.volume));
                            if (!shouldApplyRemoteVolumeChange(volume)) {
                                break;
                            }
                            set((state) => {
                                state?.player?.setVolume(volume);
                                return { ...state, volume };
                            });
                        }
                        break;
                    case 'replay':
                        {
                            clearPlaybackBroadcastSuppression();
                            set((state) => {
                                markServerPlaybackCommand();
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
                            clearPlaybackBroadcastSuppression();
                            set((state) => {
                                if (state.player) {
                                    applyRoomPlaybackToPlayer(state.player, true);
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
                            clearPlaybackBroadcastSuppression();
                            set((state) => {
                                if (state.player) {
                                    applyRoomPlaybackToPlayer(state.player, false);
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
                const { player, layoutMode, tvSuppressAutoCreate, ...rest } = state;
                // Auto mode is re-derived from viewport on load; persisting layoutMode causes remote→TV flicker.
                if (state.layoutModeSource === 'auto') {
                    return {
                        ...rest,
                        player: null,
                        layoutMode: state.layoutMode,
                        tvSuppressAutoCreate: false,
                    };
                }
                return { ...rest, player: null, layoutMode, tvSuppressAutoCreate: false };
            },
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<YouTubeState>;
                const room = persisted.room ? normalizePersistedRoom(persisted.room) : null;
                const layoutModeSource = persisted.layoutModeSource ?? 'auto';
                const merged = {
                    ...currentState,
                    ...persisted,
                    room,
                    player: null,
                    layoutModeSource,
                    tvSuppressAutoCreate: false,
                };

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
