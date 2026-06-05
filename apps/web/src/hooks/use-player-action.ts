import { useCallback, useEffect, useRef } from 'react';

import { toast } from '@/hooks/use-toast';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useWaitForRoomSession } from '@/hooks/use-room-session-ready';
import { registerPendingQueueAdd } from '@/lib/queue-action-feedback';
import { isCurrentlyPlaying, isVideoInRoom } from '@/lib/room-queue';
import { toastSessionNotReady } from '@/lib/session-toast';
import { captureTvRoomSnapshot, recoverTvRoom } from '@/lib/tv-room-recovery';
import { useI18n, useScopedI18n } from '@/locales/client';
import { useWebSocket } from '@/providers/websocket-provider';
import { markServerPlaybackSeek } from '@/lib/youtube-playback-sync';
import { useYouTubeStore } from '@/store/youtubeStore';
import type { YouTubeVideo } from '@vkara/youtube';

const ACTION_FEEDBACK_DURATION_MS = 2000;

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
    handleSyncVideoVolumeToRoom: (volume: number) => void;
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
    const actionCooldownRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        actionCooldownRef.current.clear();
    }, [room?.playingNow?.id]);

    const isActionCoolingDown = useCallback((key: string) => {
        const until = actionCooldownRef.current.get(key) ?? 0;
        return Date.now() < until;
    }, []);

    const markActionCooldown = useCallback((key: string) => {
        actionCooldownRef.current.set(key, Date.now() + ACTION_COOLDOWN_MS);
    }, []);

    const notifySessionNotReady = useCallback(() => {
        toastSessionNotReady({
            title: t('toast.sessionNotReady'),
            description: t('toast.sessionNotReadyDescription'),
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

        const snapshot = captureTvRoomSnapshot(useYouTubeStore.getState().room);
        recoverTvRoom(ensureConnectedAndSend, snapshot);

        if (useYouTubeStore.getState().room?.id) {
            return true;
        }

        try {
            await Promise.race([
                new Promise<void>((resolve) => {
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

            const currentRoom = useYouTubeStore.getState().room;
            if (isCurrentlyPlaying(currentRoom, video.id)) {
                ensureConnectedAndSend({ type: 'replay' });
                toast({
                    title: t('toast.playNowHandler'),
                    description: truncateVideoTitle(video.title),
                    variant: 'info',
                    duration: ACTION_FEEDBACK_DURATION_MS,
                });
                return;
            }

            ensureConnectedAndSend({ type: 'playNow', video });
            toast({
                title: t('toast.playNowHandler'),
                description: truncateVideoTitle(video.title),
                variant: 'info',
                duration: ACTION_FEEDBACK_DURATION_MS,
            });
        },
        [ensureConnectedAndSend, ensureRoomReady, t],
    );

    const handleAddVideoToQueue = useCallback(
        async (video: YouTubeVideo) => {
            const cooldownKey = `add:${video.id}`;
            if (isActionCoolingDown(cooldownKey)) return;
            if (!(await ensureRoomReady())) return;

            const currentRoom = useYouTubeStore.getState().room;
            if (isVideoInRoom(currentRoom, video.id)) {
                toast({
                    title: t('toast.alreadyInQueue'),
                    description: t('toast.alreadyInQueueDescription'),
                    variant: 'warning',
                });
                return;
            }

            markActionCooldown(cooldownKey);
            registerPendingQueueAdd({
                videoId: video.id,
                title: t('toast.addVideoHandler'),
                description: truncateVideoTitle(video.title),
                variant: 'success',
                duration: ACTION_FEEDBACK_DURATION_MS,
            });
            ensureConnectedAndSend({ type: 'addVideo', video });
        },
        [ensureRoomReady, ensureConnectedAndSend, t, isActionCoolingDown, markActionCooldown],
    );

    const handlePlayNextVideo = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'nextVideo' });
        toast({
            title: t('toast.nextVideoHandler'),
            variant: 'info',
            duration: ACTION_FEEDBACK_DURATION_MS,
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleRemoveVideoFromQueue = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'removeVideoFromQueue', videoId: video.id });
            toast({
                title: t('toast.removeVideoHandler'),
                description: truncateVideoTitle(video.title),
                duration: ACTION_FEEDBACK_DURATION_MS,
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t],
    );

    const handleSyncVideoVolumeToRoom = useCallback(
        async (volume: number) => {
            const clamped = Math.min(100, Math.max(0, volume));
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'setVolume', volume: clamped });
        },
        [ensureRoomReady, ensureConnectedAndSend],
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
        useYouTubeStore.getState().setIsPlaying(true);
        ensureConnectedAndSend({ type: 'play' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handlePlayerPause = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        useYouTubeStore.getState().setIsPlaying(false);
        ensureConnectedAndSend({ type: 'pause' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handleReplayVideo = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        markServerPlaybackSeek();
        useYouTubeStore.setState((state) => ({
            room: state.room
                ? { ...state.room, currentTime: 0, isPlaying: true }
                : null,
        }));
        ensureConnectedAndSend({ type: 'replay' });
    }, [ensureRoomReady, ensureConnectedAndSend]);

    const handleSeekToSeconds = useCallback(
        async (seconds: number) => {
            if (!(await ensureRoomReady())) return;

            const duration = useYouTubeStore.getState().room?.playingNow?.duration;
            const clamped =
                typeof duration === 'number' && duration > 0
                    ? Math.min(duration, Math.max(0, Math.floor(seconds)))
                    : Math.max(0, Math.floor(seconds));

            markServerPlaybackSeek();
            useYouTubeStore.setState((state) => ({
                room: state.room ? { ...state.room, currentTime: clamped } : null,
            }));
            ensureConnectedAndSend({ type: 'seek', time: clamped });
        },
        [ensureRoomReady, ensureConnectedAndSend],
    );

    const handleMoveVideoToTop = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'moveToTop', videoId: video.id });
            toast({
                title: t('toast.moveVideoToTopHandler'),
                description: truncateVideoTitle(video.title),
                duration: ACTION_FEEDBACK_DURATION_MS,
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t],
    );

    const handleShuffleQueue = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'shuffleQueue' });
        toast({
            title: t('toast.shuffleQueueHandler'),
            variant: 'info',
            duration: ACTION_FEEDBACK_DURATION_MS,
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleClearQueue = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'clearQueue' });
        toast({
            title: t('toast.clearQueueHandler'),
            duration: ACTION_FEEDBACK_DURATION_MS,
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleClearHistory = useCallback(async () => {
        if (!(await ensureRoomReady())) return;
        ensureConnectedAndSend({ type: 'clearHistory' });
        toast({
            title: t('toast.clearHistoryHandler'),
            duration: ACTION_FEEDBACK_DURATION_MS,
        });
    }, [ensureRoomReady, ensureConnectedAndSend, t]);

    const handleAddVideoAndMoveToTop = useCallback(
        async (video: YouTubeVideo) => {
            const cooldownKey = `add-top:${video.id}`;
            if (isActionCoolingDown(cooldownKey)) return;
            if (!(await ensureRoomReady())) return;

            markActionCooldown(cooldownKey);
            ensureConnectedAndSend({ type: 'addVideoAndMoveToTop', video });
            toast({
                title: t('toast.addVideoAndMoveToTopHandler'),
                description: truncateVideoTitle(video.title),
                duration: ACTION_FEEDBACK_DURATION_MS,
            });
        },
        [ensureRoomReady, ensureConnectedAndSend, t, isActionCoolingDown, markActionCooldown],
    );

    const handleImportPlaylist = useCallback(
        async (playlistUrlOrId: string) => {
            if (!(await ensureRoomReady())) return;
            ensureConnectedAndSend({ type: 'importPlaylist', playlistUrlOrId });
            toast({
                title: t('toast.importPlaylistHandler'),
                variant: 'info',
                duration: ACTION_FEEDBACK_DURATION_MS,
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
        handleSyncVideoVolumeToRoom,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
        handleClearHistory,
        handleAddVideoAndMoveToTop,
        handleImportPlaylist,
    };
};
