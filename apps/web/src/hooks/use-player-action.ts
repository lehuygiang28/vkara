import { useCallback, useEffect, useRef } from 'react';
import { shouldBroadcastPlaybackTime, type PlaybackTimeSyncState } from '@vkara/shared-types';
import { toast } from '@/hooks/use-toast';
import { useI18n, useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';

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

export const usePlayerAction = (): PlayerAction => {
    const t = useI18n();
    const tJoinLobby = useScopedI18n('joinLobby');
    const { ensureConnectedAndSend } = useWebSocket();
    const { room } = useYouTubeStore();
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const lastSeekSentRef = useRef<PlaybackTimeSyncState | undefined>(undefined);

    useEffect(() => {
        lastSeekSentRef.current = undefined;
    }, [room?.playingNow?.id]);

    const createRoomIfNeeded = useCallback(async (): Promise<boolean> => {
        if (room?.id) return true;

        if (effectiveLayoutMode === 'remote') {
            toast({
                title: tJoinLobby('joinRequiredTitle'),
                description: tJoinLobby('joinRequiredDescription'),
                variant: 'error',
            });
            return false;
        }

        await new Promise<void>((resolve) => {
            ensureConnectedAndSend({ type: 'createRoom' });
            const unsubscribe = useYouTubeStore.subscribe((state) => {
                if (state.room?.id) {
                    unsubscribe();
                    resolve();
                }
            });
        });
        return true;
    }, [room?.id, effectiveLayoutMode, ensureConnectedAndSend, tJoinLobby]);

    const handlePlayVideoNow = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'playNow', video });
            toast({
                title: t('toast.playNowHandler'),
                description: video.title,
                variant: 'info',
            });
        },
        [ensureConnectedAndSend, t, createRoomIfNeeded],
    );

    const handleAddVideoToQueue = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'addVideo', video });
            toast({
                title: t('toast.addVideoHandler'),
                description: video.title,
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handlePlayNextVideo = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'nextVideo' });
        toast({
            title: t('toast.nextVideoHandler'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleRemoveVideoFromQueue = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await createRoomIfNeeded())) return;

            ensureConnectedAndSend({ type: 'removeVideoFromQueue', videoId: video.id });

            toast({
                title: t('toast.removeVideoHandler'),
                description: video.title,
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handleSetVideoVolume = useCallback(
        async (volume: number) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'setVolume', volume });
            toast({
                title: t('toast.setVolumeHandler'),
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handlePlayerPlay = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'play' });
        toast({
            title: t('youtubePage.play'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handlePlayerPause = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'pause' });
        toast({
            title: t('youtubePage.pause'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleReplayVideo = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'replay' });
        toast({
            title: t('youtubePage.replay'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleSeekToSeconds = useCallback(
        async (seconds: number) => {
            if (!(await createRoomIfNeeded())) return;

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
            toast({
                title: `${t('youtubePage.seekTo')} ${seconds}s`,
                variant: 'info',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handleMoveVideoToTop = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'moveToTop', videoId: video.id });
            toast({
                title: t('toast.moveVideoToTopHandler'),
                description: video.title,
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handleShuffleQueue = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'shuffleQueue' });
        toast({
            title: t('toast.shuffleQueueHandler'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleClearQueue = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'clearQueue' });
        toast({
            title: t('toast.clearQueueHandler'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleClearHistory = useCallback(async () => {
        if (!(await createRoomIfNeeded())) return;
        ensureConnectedAndSend({ type: 'clearHistory' });

        toast({
            title: t('toast.clearHistoryHandler'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleAddVideoAndMoveToTop = useCallback(
        async (video: YouTubeVideo) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'addVideoAndMoveToTop', video });
            toast({
                title: t('toast.addVideoAndMoveToTopHandler'),
                description: video.title,
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handleImportPlaylist = useCallback(
        async (playlistUrlOrId: string) => {
            if (!(await createRoomIfNeeded())) return;
            ensureConnectedAndSend({ type: 'importPlaylist', playlistUrlOrId });
            toast({
                title: t('toast.importPlaylistHandler'),
                variant: 'info',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
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
