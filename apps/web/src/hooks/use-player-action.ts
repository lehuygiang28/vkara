import { useCallback, useEffect, useRef } from 'react';
import { shouldBroadcastPlaybackTime, type PlaybackTimeSyncState } from '@vkara/shared-types';
import { toast, toastFeedback } from '@/hooks/use-toast';
import { useI18n, useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useWaitForRoomSession } from '@/hooks/use-room-session-ready';

export type PlayerAction = {
    handlePlayerPlay: () => void;
    handlePlayerPause: () => void;
    handleReplayVideo: () => void;
    handleSeekToSeconds: (seconds: number) => void;
    handlePlayVideoNow: (video: YouTubeVideo) => void;
    handleAddVideoToQueue: (video: YouTubeVideo) => void;
    handlePlayNextVideo: () => void;
    handleRemoveVideoFromQueue: (video: YouTubeVideo) => void;
    handleSetVideoVolume: (volume: number) => void;
    handleMoveVideoToTop: (video: YouTubeVideo) => void;
    handleShuffleQueue: () => void;
    handleClearQueue: () => void;
    handleClearHistory: () => void;
    handleAddVideoAndMoveToTop: (video: YouTubeVideo) => void;
    handleImportPlaylist: (playlistUrlOrId: string) => void;
};

const CREATE_ROOM_TIMEOUT_MS = 15000;
const ACTION_COOLDOWN_MS = 600;

function truncateVideoTitle(title: string, max = 52): string {
    if (title.length <= max) return title;
    return `${title.slice(0, max - 1)}…`;
}

export const usePlayerAction = (): PlayerAction => {
    const t = useI18n();
    const tJoinLobby = useScopedI18n('joinLobby');
    const { ensureConnectedAndSend } = useWebSocket();
    const { room } = useYouTubeStore();
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const waitForRoomSession = useWaitForRoomSession();
    const lastSeekSentRef = useRef<PlaybackTimeSyncState | undefined>(undefined);
    const actionCooldownRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        lastSeekSentRef.current = undefined;
    }, [room?.playingNow?.id]);

    const isActionCoolingDown = useCallback((key: string) => {
        const until = actionCooldownRef.current.get(key) ?? 0;
        return Date.now() < until;
    }, []);

    const markActionCooldown = useCallback((key: string) => {
        actionCooldownRef.current.set(key, Date.now() + ACTION_COOLDOWN_MS);
    }, []);

    const notifySessionNotReady = useCallback(() => {
        toast({
            id: 'session-not-ready',
            title: t('toast.sessionNotReady'),
            description: t('toast.sessionNotReadyDescription'),
            variant: 'error',
        });
    }, [t]);

    const createRoomIfNeeded = useCallback(async (): Promise<boolean> => {
        if (room?.id) return true;

        if (effectiveLayoutMode === 'remote') {
            toast({
                id: 'join-required',
                title: tJoinLobby('joinRequiredTitle'),
                description: tJoinLobby('joinRequiredDescription'),
                variant: 'error',
            });
            return false;
        }

        ensureConnectedAndSend({ type: 'createRoom' });

        if (useYouTubeStore.getState().room?.id) {
            return true;
        }

        try {
            await Promise.race([
                new Promise<void>((resolve, reject) => {
                    const unsubscribe = useYouTubeStore.subscribe((state) => {
                        if (state.room?.id) {
                            unsubscribe();
                            resolve();
                        }
                    });
                }),
                new Promise<void>((_, reject) => {
                    setTimeout(() => reject(new Error('createRoomTimeout')), CREATE_ROOM_TIMEOUT_MS);
                }),
            ]);
            return true;
        } catch {
            notifySessionNotReady();
            return false;
        }
    }, [room?.id, effectiveLayoutMode, ensureConnectedAndSend, tJoinLobby, notifySessionNotReady]);

    const ensureRoomReady = useCallback(async (): Promise<boolean> => {
        if (room?.id) {
            if (!(await waitForRoomSession())) {
                notifySessionNotReady();
                return false;
            }
            return true;
        }

        return createRoomIfNeeded();
    }, [room?.id, waitForRoomSession, createRoomIfNeeded, notifySessionNotReady]);

    const handlePlayVideoNow = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'playNow', video });
            toastFeedback({
                id: 'action-play-now',
                title: t('toast.playNowHandler'),
                description: truncateVideoTitle(video.title),
                variant: 'info',
            });
        },
        [ensureConnectedAndSend, ensureRoomReady, t],
    );

    const handleAddVideoToQueue = useCallback(
        async (video: YouTubeVideo) => {
            const cooldownKey = `add:${video.id}`;
            if (isActionCoolingDown(cooldownKey)) return;
            if (!(await ensureRoomReady())) return;

            markActionCooldown(cooldownKey);
            ensureConnectedAndSend({ type: 'addVideo', video });
            toastFeedback({
                id: 'action-add-queue',
                title: t('toast.addVideoHandler'),
                description: truncateVideoTitle(video.title),
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t, isActionCoolingDown, markActionCooldown],
    );

    const handlePlayNextVideo = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'nextVideo' });
        toastFeedback({
            id: 'action-next-video',
            title: t('toast.nextVideoHandler'),
            variant: 'info',
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleRemoveVideoFromQueue = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'removeVideoFromQueue', videoId: video.id });
            toastFeedback({
                id: 'action-remove-queue',
                title: t('toast.removeVideoHandler'),
                description: truncateVideoTitle(video.title),
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t],
    );

    const handleSetVideoVolume = useCallback(
        async (volume: number) => {
            const clamped = Math.min(100, Math.max(0, volume));
            const { setVolume, player } = useYouTubeStore.getState();
            setVolume(clamped);
            player?.setVolume(clamped);
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'setVolume', volume: clamped });
        },
        [ensureRoomReady, ensureConnectedAndSend],
    );

    const handlePlayerPlay = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'play' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handlePlayerPause = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'pause' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handleReplayVideo = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'replay' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handleSeekToSeconds = useCallback(
        async (seconds: number) => {
            if (!(await ensureRoomReady())) return;

            const previousSeconds = useYouTubeStore.getState().room?.currentTime ?? seconds;
            if (
                !shouldBroadcastPlaybackTime(
                    lastSeekSentRef.current,
                    seconds,
                    previousSeconds,
                )
            ) {
                return;
            }

            lastSeekSentRef.current = { at: Date.now(), seconds };
            ensureConnectedAndSend({ type: 'seek', time: seconds });
        },
        [ensureRoomReady, ensureConnectedAndSend],
    );

    const handleMoveVideoToTop = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'moveToTop', videoId: video.id });
            toastFeedback({
                id: 'action-move-top',
                title: t('toast.moveVideoToTopHandler'),
                description: truncateVideoTitle(video.title),
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t],
    );

    const handleShuffleQueue = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'shuffleQueue' });
        toastFeedback({
            id: 'action-shuffle',
            title: t('toast.shuffleQueueHandler'),
            variant: 'info',
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleClearQueue = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'clearQueue' });
        toastFeedback({
            id: 'action-clear-queue',
            title: t('toast.clearQueueHandler'),
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleClearHistory = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'clearHistory' });
        toastFeedback({
            id: 'action-clear-history',
            title: t('toast.clearHistoryHandler'),
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleAddVideoAndMoveToTop = useCallback(
        async (video: YouTubeVideo) => {
            const cooldownKey = `add-top:${video.id}`;
            if (isActionCoolingDown(cooldownKey)) return;
            if (!(await ensureRoomReady())) return;

            markActionCooldown(cooldownKey);
            ensureConnectedAndSend({ type: 'addVideoAndMoveToTop', video });
            toastFeedback({
                id: 'action-add-next',
                title: t('toast.addVideoAndMoveToTopHandler'),
                description: truncateVideoTitle(video.title),
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t, isActionCoolingDown, markActionCooldown],
    );

    const handleImportPlaylist = useCallback(
        async (playlistUrlOrId: string) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'importPlaylist', playlistUrlOrId });
            toastFeedback({
                id: 'action-import-playlist',
                title: t('toast.importPlaylistHandler'),
                variant: 'info',
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t],
    );

    return {
        handlePlayerPlay,
        handlePlayerPause,
        handleReplayVideo,
        handleSeekToSeconds,
        handlePlayVideoNow,
        handleAddVideoToQueue,
        handlePlayNextVideo,
        handleRemoveVideoFromQueue,
        handleSetVideoVolume,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
        handleClearHistory,
        handleAddVideoAndMoveToTop,
        handleImportPlaylist,
    };
};
