import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';

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
    const { ensureConnectedAndSend } = useWebSocket();
    const { room } = useYouTubeStore();

    const createRoomIfNeeded = useCallback(async () => {
        if (!room?.id) {
            await new Promise<void>((resolve) => {
                ensureConnectedAndSend({ type: 'createRoom' });
                const unsubscribe = useYouTubeStore.subscribe((state) => {
                    if (state.room?.id) {
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }
    }, [room?.id, ensureConnectedAndSend]);

    const handlePlayVideoNow = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
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
            await createRoomIfNeeded();
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
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'nextVideo' });
        toast({
            title: t('toast.nextVideoHandler'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleRemoveVideoFromQueue = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();

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
            await createRoomIfNeeded();
            ensureConnectedAndSend({ type: 'setVolume', volume });
            toast({
                title: t('toast.setVolumeHandler'),
                variant: 'success',
            });
        },
        [createRoomIfNeeded, ensureConnectedAndSend, t],
    );

    const handlePlayerPlay = useCallback(async () => {
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'play' });
        toast({
            title: t('youtubePage.play'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handlePlayerPause = useCallback(async () => {
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'pause' });
        toast({
            title: t('youtubePage.pause'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleReplayVideo = useCallback(async () => {
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'replay' });
        toast({
            title: t('youtubePage.replay'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleSeekToSeconds = useCallback(
        async (seconds: number) => {
            await createRoomIfNeeded();
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
            await createRoomIfNeeded();
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
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'shuffleQueue' });
        toast({
            title: t('toast.shuffleQueueHandler'),
            variant: 'info',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleClearQueue = useCallback(async () => {
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'clearQueue' });
        toast({
            title: t('toast.clearQueueHandler'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleClearHistory = useCallback(async () => {
        await createRoomIfNeeded();
        ensureConnectedAndSend({ type: 'clearHistory' });

        toast({
            title: t('toast.clearHistoryHandler'),
            variant: 'success',
        });
    }, [createRoomIfNeeded, ensureConnectedAndSend, t]);

    const handleAddVideoAndMoveToTop = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
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
            await createRoomIfNeeded();
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
