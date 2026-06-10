'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { applyPlaybackSeek } from '@/lib/active-playback';
import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import {
    markServerPlaybackCommand,
    markUserSeekTarget,
} from '@/lib/youtube-playback-sync';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const TvNextUpOverlay = dynamic(
    () => import('./tv-next-up-overlay').then((m) => m.TvNextUpOverlay),
    { ssr: false },
);

function TvNextUpGateInner() {
    const shouldShowTimer = useCountdownStore((s) => s.shouldShowTimer);

    const { playingNowId, nextQueuedVideo, videoQueueLength } = useYouTubeStore(
        useShallow((s) => ({
            playingNowId: s.room?.playingNow?.id ?? null,
            nextQueuedVideo: s.room?.videoQueue?.[0] ?? null,
            videoQueueLength: s.room?.videoQueue?.length ?? 0,
        })),
    );

    const showOverlay = Boolean(
        playingNowId && shouldShowTimer && videoQueueLength > 0 && nextQueuedVideo,
    );

    const dismissNextUp = useCallback(() => {
        useCountdownStore.getState().cancelCountdown();
    }, []);

    const handleVideoFinished = useCallback(() => {
        const currentRoom = useYouTubeStore.getState().room;
        if (!currentRoom?.playingNow) {
            dismissNextUp();
            return;
        }
        ensureConnectedAndSend({ type: 'videoFinished' });
    }, [dismissNextUp]);

    const handleReplayVideo = useCallback(() => {
        const previous = useYouTubeStore.getState().room?.currentTime ?? 0;
        markUserSeekTarget(0, previous);
        useYouTubeStore.setState((state) => ({
            room: state.room ? { ...state.room, currentTime: 0, isPlaying: true } : null,
        }));
        const { player, room } = useYouTubeStore.getState();
        applyPlaybackSeek({
            video: room?.playingNow,
            youtubePlayer: player,
            seconds: 0,
        });
        markServerPlaybackCommand();
        ensureConnectedAndSend({ type: 'replay' });
    }, []);

    const handleNextUpReplay = useCallback(() => {
        dismissNextUp();
        handleReplayVideo();
    }, [dismissNextUp, handleReplayVideo]);

    if (!showOverlay || !nextQueuedVideo) {
        return null;
    }

    return (
        <TvNextUpOverlay
            nextVideo={nextQueuedVideo}
            onPlayNextAction={handleVideoFinished}
            onReplayAction={handleNextUpReplay}
            onCountdownCompleteAction={handleVideoFinished}
        />
    );
}

export const TvNextUpGate = memo(TvNextUpGateInner);
