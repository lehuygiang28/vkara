import { useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';

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
};

export const usePlayerAction = (): PlayerAction => {
    const t = useI18n();
    const { sendMessage } = useWebSocketStore();
    const { room } = useYouTubeStore();

    const createRoomIfNeeded = useCallback(async () => {
        if (!room?.id) {
            await new Promise<void>((resolve) => {
                sendMessage({ type: 'createRoom' });
                const unsubscribe = useYouTubeStore.subscribe((state) => {
                    if (state.room?.id) {
                        unsubscribe();
                        resolve();
                    }
                });
            });
        }
    }, [room?.id, sendMessage]);

    const handlePlayVideoNow = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'playNow', video });
            toast({
                title: t('toast.playNowHandler'),
                description: video.title,
            });
        },
        [sendMessage, t, createRoomIfNeeded],
    );

    const handleAddVideoToQueue = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'addVideo', video });
            toast({
                title: t('toast.addVideoHandler'),
                description: video.title,
            });
        },
        [createRoomIfNeeded, sendMessage, t],
    );

    const handlePlayNextVideo = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'nextVideo' });
        toast({
            title: t('toast.nextVideoHandler'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleRemoveVideoFromQueue = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();

            sendMessage({ type: 'removeVideoFromQueue', videoId: video.id });

            toast({
                title: t('toast.removeVideoHandler'),
                description: video.title,
            });
        },
        [createRoomIfNeeded, sendMessage, t],
    );

    const handleSetVideoVolume = useCallback(
        async (volume: number) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'setVolume', volume });
            toast({
                title: t('toast.setVolumeHandler'),
            });
        },
        [createRoomIfNeeded, sendMessage, t],
    );

    const handlePlayerPlay = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'play' });
        toast({
            title: t('youtubePage.play'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handlePlayerPause = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'pause' });
        toast({
            title: t('youtubePage.pause'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleReplayVideo = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'replay' });
        toast({
            title: t('youtubePage.replay'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleSeekToSeconds = useCallback(
        async (seconds: number) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'seek', time: seconds });
            toast({
                title: `${t('youtubePage.seekTo')} ${seconds}s`,
            });
        },
        [createRoomIfNeeded, sendMessage, t],
    );

    const handleMoveVideoToTop = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'moveToTop', videoId: video.id });
            toast({
                title: t('toast.moveVideoToTopHandler'),
                description: video.title,
            });
        },
        [createRoomIfNeeded, sendMessage, t],
    );

    const handleShuffleQueue = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'shuffleQueue' });
        toast({
            title: t('toast.shuffleQueueHandler'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleClearQueue = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'clearQueue' });
        toast({
            title: t('toast.clearQueueHandler'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleClearHistory = useCallback(async () => {
        await createRoomIfNeeded();
        sendMessage({ type: 'clearHistory' });

        toast({
            title: t('toast.clearHistoryHandler'),
        });
    }, [createRoomIfNeeded, sendMessage, t]);

    const handleAddVideoAndMoveToTop = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
            sendMessage({ type: 'addVideoAndMoveToTop', video });
            toast({
                title: t('toast.addVideoAndMoveToTopHandler'),
                description: video.title,
            });
        },
        [createRoomIfNeeded, sendMessage, t],
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
    };
};
