'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { readPlaybackPositionSeconds } from '@/lib/active-playback';
import { shouldSuppressPlaybackBroadcast } from '@/lib/youtube-playback-sync';
import {
    acceptSyncPlaybackPositionTime,
    PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS,
    shouldBroadcastPlaybackTime,
    type PlaybackTimeSyncState,
} from '@vkara/room';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';

const PERIODIC_SYNC_INTERVAL_MS = PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS;

/**
 * TV / laptop player reports playback position to the room at a low rate.
 * Uses syncPlaybackPosition (not seek) so remotes get anchors without re-seeking the TV.
 */
export function usePlaybackPositionSync(): void {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const playingNowId = playingNow?.id;
    const isPlaying = useYouTubeStore((s) => s.room?.isPlaying ?? false);
    const { ensureConnectedAndSend } = useWebSocket();
    const isRoomSessionReady = useIsRoomSessionReady();
    const lastSentRef = useRef<PlaybackTimeSyncState | undefined>(undefined);
    const prevIsPlayingRef = useRef<boolean | undefined>(undefined);

    const readActiveSeconds = useCallback((): number | null => {
        const { player, room } = useYouTubeStore.getState();
        if (!room?.playingNow) {
            return null;
        }
        return readPlaybackPositionSeconds({
            video: room.playingNow,
            youtubePlayer: player,
            roomIsPlaying: room.isPlaying ?? false,
            roomCurrentTime: room.currentTime ?? 0,
        });
    }, []);

    const sendSync = useCallback(
        (seconds: number, force = false) => {
            if (!roomId || !isRoomSessionReady || !playingNowId) return;
            if (shouldSuppressPlaybackBroadcast()) return;

            const serverTime = useYouTubeStore.getState().room?.currentTime ?? 0;
            const accepted = acceptSyncPlaybackPositionTime(serverTime, seconds);
            if (accepted === null) {
                return;
            }

            const previous = serverTime;
            if (!force && !shouldBroadcastPlaybackTime(lastSentRef.current, accepted, previous)) {
                return;
            }

            lastSentRef.current = { at: Date.now(), seconds: accepted };
            ensureConnectedAndSend({
                type: 'syncPlaybackPosition',
                time: accepted,
                videoId: playingNowId,
                force,
            });
        },
        [roomId, isRoomSessionReady, playingNowId, ensureConnectedAndSend],
    );

    useEffect(() => {
        lastSentRef.current = undefined;
        prevIsPlayingRef.current = undefined;
    }, [playingNowId]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote') return;
        if (!roomId) return;

        const wasPlaying = prevIsPlayingRef.current;
        prevIsPlayingRef.current = isPlaying;

        if (wasPlaying === true && !isPlaying) {
            const seconds = readActiveSeconds();
            if (seconds !== null) {
                sendSync(seconds, true);
            }
        }
    }, [effectiveLayoutMode, roomId, isPlaying, readActiveSeconds, sendSync]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote') return;
        if (!roomId || !isPlaying) return;

        const tick = () => {
            const seconds = readActiveSeconds();
            if (seconds === null) {
                return;
            }
            sendSync(seconds);
        };

        tick();
        const id = window.setInterval(tick, PERIODIC_SYNC_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [effectiveLayoutMode, roomId, isPlaying, readActiveSeconds, sendSync]);
}
