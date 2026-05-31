'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import {
    PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS,
    shouldBroadcastPlaybackTime,
    type PlaybackTimeSyncState,
} from '@vkara/shared-types';

const PERIODIC_SYNC_INTERVAL_MS = PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS;

function readPlayerSeconds(player: YT.Player): number {
    return Math.max(0, Math.floor(player.getCurrentTime()));
}

/**
 * TV / laptop player reports playback position to the room at a low rate.
 * Uses syncPlaybackPosition (not seek) so remotes get anchors without re-seeking the TV.
 */
export function usePlaybackPositionSync(): void {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const player = useYouTubeStore((s) => s.player);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const playingNowId = useYouTubeStore((s) => s.room?.playingNow?.id);
    const isPlaying = useYouTubeStore((s) => s.room?.isPlaying ?? false);
    const { ensureConnectedAndSend } = useWebSocket();
    const lastSentRef = useRef<PlaybackTimeSyncState | undefined>(undefined);
    const prevIsPlayingRef = useRef<boolean | undefined>(undefined);

    const sendSync = useCallback(
        (seconds: number, force = false) => {
            if (!roomId) return;

            const previous = useYouTubeStore.getState().room?.currentTime ?? seconds;
            if (
                !force &&
                !shouldBroadcastPlaybackTime(lastSentRef.current, seconds, previous)
            ) {
                return;
            }

            lastSentRef.current = { at: Date.now(), seconds };
            ensureConnectedAndSend({ type: 'syncPlaybackPosition', time: seconds, force });
        },
        [roomId, ensureConnectedAndSend],
    );

    useEffect(() => {
        lastSentRef.current = undefined;
        prevIsPlayingRef.current = undefined;
    }, [playingNowId]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote') return;
        if (!player || !roomId) return;

        const wasPlaying = prevIsPlayingRef.current;
        prevIsPlayingRef.current = isPlaying;

        if (wasPlaying === true && !isPlaying) {
            sendSync(readPlayerSeconds(player), true);
        }
    }, [effectiveLayoutMode, player, roomId, isPlaying, sendSync]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote') return;
        if (!player || !roomId || !isPlaying) return;

        const tick = () => {
            sendSync(readPlayerSeconds(player));
        };

        tick();
        const id = window.setInterval(tick, PERIODIC_SYNC_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [effectiveLayoutMode, player, roomId, isPlaying, sendSync]);
}
