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
};

export const usePlayerAction = (): PlayerAction => {
    const t = useI18n();
    const { sendMessage } = useWebSocketStore();
    const {
        room,
        playNow: playVideoNow,
        addVideo: addVideoToQueue,
        nextVideo: playNextVideo,
        removeVideo: removeVideoFromQueue,
        setVolume: setVideoVolume,
        player,
        setRoom,
    } = useYouTubeStore();

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
            if (room?.id) {
                sendMessage({ type: 'playNow', video });
            } else {
                playVideoNow(video);
            }
            toast({
                title: t('toast.playNowHandler'),
                description: video.title,
            });
        },
        [room?.id, sendMessage, playVideoNow, t, createRoomIfNeeded],
    );

    const handleAddVideoToQueue = useCallback(
        async (video: YouTubeVideo) => {
            await createRoomIfNeeded();
            if (room?.id) {
                sendMessage({ type: 'addVideo', video });
            } else {
                addVideoToQueue(video);
            }
            toast({
                title: t('toast.addVideoHandler'),
                description: video.title,
            });
        },
        [addVideoToQueue, createRoomIfNeeded, room?.id, sendMessage, t],
    );

    const handlePlayNextVideo = useCallback(async () => {
        await createRoomIfNeeded();
        if (room?.id) {
            sendMessage({ type: 'nextVideo' });
        } else {
            playNextVideo();
        }
        toast({
            title: t('toast.nextVideoHandler'),
        });
    }, [createRoomIfNeeded, playNextVideo, room?.id, sendMessage, t]);

    const handleRemoveVideoFromQueue = useCallback(
        (video: YouTubeVideo) => {
            if (room?.id) {
                sendMessage({ type: 'removeVideoFromQueue', videoId: video.id });
            } else {
                removeVideoFromQueue(video.id);
            }
            toast({
                title: t('toast.removeVideoHandler'),
                description: video.title,
            });
        },
        [removeVideoFromQueue, room?.id, sendMessage, t],
    );

    const handleSetVideoVolume = useCallback(
        async (volume: number) => {
            await createRoomIfNeeded();
            if (room?.id) {
                sendMessage({ type: 'setVolume', volume });
            } else {
                setVideoVolume(volume);
            }
            toast({
                title: t('toast.setVolumeHandler'),
            });
        },
        [createRoomIfNeeded, room?.id, sendMessage, setVideoVolume, t],
    );

    const handlePlayerPlay = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'play' });
        } else if (player) {
            player.playVideo();
        }
        toast({
            title: t('youtubePage.play'),
        });
    }, [player, room?.id, sendMessage, t]);

    const handlePlayerPause = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'pause' });
        } else if (player) {
            player.pauseVideo();
        }
        toast({
            title: t('youtubePage.pause'),
        });
    }, [player, room?.id, sendMessage, t]);

    const handleReplayVideo = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'replay' });
        } else if (player) {
            player.seekTo(0, true);
        }
        toast({
            title: t('youtubePage.replay'),
        });
    }, [player, room?.id, sendMessage, t]);

    const handleSeekToSeconds = useCallback(
        (seconds: number) => {
            if (room?.id) {
                sendMessage({ type: 'seek', time: seconds });
            } else if (player) {
                player.seekTo(seconds, true);
            }
            toast({
                title: `${t('youtubePage.seekTo')} ${seconds}s`,
            });
        },
        [player, room?.id, sendMessage, t],
    );

    const handleMoveVideoToTop = useCallback(
        (video: YouTubeVideo) => {
            if (room?.id) {
                sendMessage({ type: 'moveToTop', videoId: video.id });
            } else {
                const newQueue = room?.videoQueue.filter((v) => v.id !== video.id);
                if (room) {
                    setRoom({ ...room, videoQueue: [video, ...(newQueue || [])] });
                }
            }

            toast({
                title: t('toast.moveVideoToTopHandler'),
                description: video.title,
            });
        },
        [room, sendMessage, setRoom, t],
    );

    const handleShuffleQueue = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'shuffleQueue' });
        } else if (room) {
            setRoom({ ...room, videoQueue: room.videoQueue.sort(() => Math.random() - 0.5) });
        }

        toast({
            title: t('toast.shuffleQueueHandler'),
        });
    }, [room, sendMessage, setRoom, t]);

    const handleClearQueue = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'clearQueue' });
        } else if (room) {
            setRoom({ ...room, videoQueue: [] });
        }
        toast({
            title: t('toast.clearQueueHandler'),
        });
    }, [room, sendMessage, setRoom, t]);

    const handleClearHistory = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'clearHistory' });
        } else if (room) {
            setRoom({ ...room, historyQueue: [] });
        }
        toast({
            title: t('toast.clearHistoryHandler'),
        });
    }, [room, sendMessage, setRoom, t]);

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
    };
};
