/* eslint-disable react-hooks/exhaustive-deps */
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

    const handlePlayVideoNow = useCallback((video: YouTubeVideo) => {
        if (room?.id) {
            sendMessage({ type: 'playNow', video });
        } else {
            playVideoNow(video);
        }
        toast({
            title: t('toast.playNowHandler'),
            description: video.title,
        });
    }, []);

    const handleAddVideoToQueue = useCallback((video: YouTubeVideo) => {
        if (room?.id) {
            sendMessage({ type: 'addVideo', video });
        } else {
            addVideoToQueue(video);
        }
        toast({
            title: t('toast.addVideoHandler'),
            description: video.title,
        });
    }, []);

    const handlePlayNextVideo = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'nextVideo' });
        } else {
            playNextVideo();
        }
        toast({
            title: t('toast.nextVideoHandler'),
        });
    }, []);

    const handleRemoveVideoFromQueue = useCallback((video: YouTubeVideo) => {
        if (room?.id) {
            sendMessage({ type: 'removeVideo', videoId: video.id });
        } else {
            removeVideoFromQueue(video.id);
        }
        toast({
            title: t('toast.removeVideoHandler'),
            description: video.title,
        });
    }, []);

    const handleSetVideoVolume = useCallback((volume: number) => {
        if (room?.id) {
            sendMessage({ type: 'setVolume', volume });
        } else {
            setVideoVolume(volume);
        }
        toast({
            title: t('toast.setVolumeHandler'),
        });
    }, []);

    const handlePlayerPlay = useCallback(() => {
        if (room) {
            sendMessage({ type: 'play' });
        } else if (player) {
            player.playVideo();
        }
        toast({
            title: t('youtubePage.play'),
        });
    }, [player]);

    const handlePlayerPause = useCallback(() => {
        if (room) {
            sendMessage({ type: 'pause' });
        } else if (player) {
            player.pauseVideo();
        }
        toast({
            title: t('youtubePage.pause'),
        });
    }, [player]);

    const handleReplayVideo = useCallback(() => {
        if (room) {
            sendMessage({ type: 'replay' });
        } else if (player) {
            player.seekTo(0, true);
        }
        toast({
            title: t('youtubePage.replay'),
        });
    }, [player]);

    const handleSeekToSeconds = useCallback(
        (seconds: number) => {
            if (room) {
                sendMessage({ type: 'seek', time: seconds });
            } else if (player) {
                player.seekTo(seconds, true);
            }
            toast({
                title: `${t('youtubePage.seekTo')} ${seconds}s`,
            });
        },
        [player],
    );

    const handleMoveVideoToTop = useCallback((video: YouTubeVideo) => {
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
    }, []);

    const handleShuffleQueue = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'shuffleQueue' });
        } else if (room) {
            room.videoQueue.sort(() => Math.random() - 0.5);
        }
        toast({
            title: t('toast.shuffleQueueHandler'),
        });
    }, []);

    const handleClearQueue = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'clearQueue' });
        } else if (room) {
            setRoom({ ...room, videoQueue: [] });
        }
        toast({
            title: t('toast.clearQueueHandler'),
        });
    }, []);

    const handleClearHistory = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'clearHistory' });
        } else if (room) {
            setRoom({ ...room, historyQueue: [] });
        }
        toast({
            title: t('toast.clearHistoryHandler'),
        });
    }, []);

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
