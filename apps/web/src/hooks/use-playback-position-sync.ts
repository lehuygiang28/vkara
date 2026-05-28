'use client';

import { useEffect, useRef } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import {
    PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS,
    shouldBroadcastPlaybackTime,
    type PlaybackTimeSyncState,
} from '@vkara/shared-types';

/**
 * Optional low-frequency playback position reporter for the TV player.
 *
 * Disabled by default — VKara does not poll getCurrentTime() every second.
 * Enable only if drift correction is required; interval is intentionally coarse.
 */
const ENABLE_PERIODIC_PLAYBACK_SYNC = false;
const PERIODIC_SYNC_INTERVAL_MS = PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS;

export function usePlaybackPositionSync(): void {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const player = useYouTubeStore((s) => s.player);
    const room = useYouTubeStore((s) => s.room);
    const { ensureConnectedAndSend } = useWebSocket();
    const lastSentRef = useRef<PlaybackTimeSyncState | undefined>(undefined);

    useEffect(() => {
        if (!ENABLE_PERIODIC_PLAYBACK_SYNC) return;
        if (effectiveLayoutMode === 'remote') return;
        if (!player || !room?.id || !room.isPlaying) return;

        const tick = () => {
            const seconds = Math.floor(player.getCurrentTime());
            const previous = useYouTubeStore.getState().room?.currentTime ?? seconds;
            if (!shouldBroadcastPlaybackTime(lastSentRef.current, seconds, previous)) {
                return;
            }
            lastSentRef.current = { at: Date.now(), seconds };
            ensureConnectedAndSend({ type: 'seek', time: seconds });
        };

        const id = window.setInterval(tick, PERIODIC_SYNC_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [
        effectiveLayoutMode,
        player,
        room?.id,
        room?.isPlaying,
        ensureConnectedAndSend,
    ]);
}
