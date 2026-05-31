'use client';

import { useEffect, useRef, useState } from 'react';

import {
    computeExtrapolatedPlaybackSeconds,
    type PlaybackDisplayAnchor,
} from '@vkara/shared-types';
import { useYouTubeStore } from '@/store/youtubeStore';

const TICK_MS = 1_000;

/**
 * Smooth playback position for UI: extrapolates from the last server anchor while playing.
 */
export function usePlaybackDisplayTime(): number {
    const room = useYouTubeStore((s) => s.room);
    const anchorRef = useRef<PlaybackDisplayAnchor>({
        baseSeconds: 0,
        syncedAtMs: Date.now(),
        isPlaying: false,
        videoId: null,
    });
    const [displayTime, setDisplayTime] = useState(0);

    const videoId = room?.playingNow?.id ?? null;
    const serverTime = room?.currentTime ?? 0;
    const isPlaying = Boolean(room?.isPlaying);

    useEffect(() => {
        anchorRef.current = {
            baseSeconds: serverTime,
            syncedAtMs: Date.now(),
            isPlaying,
            videoId,
        };
        setDisplayTime(computeExtrapolatedPlaybackSeconds(anchorRef.current));
    }, [serverTime, isPlaying, videoId]);

    useEffect(() => {
        if (!isPlaying || !videoId) {
            return;
        }

        const tick = () => {
            setDisplayTime(computeExtrapolatedPlaybackSeconds(anchorRef.current));
        };

        tick();
        const id = window.setInterval(tick, TICK_MS);
        return () => window.clearInterval(id);
    }, [isPlaying, videoId]);

    return displayTime;
}
