'use client';

import { useEffect } from 'react';

import { isTikTokPlayback } from '@/lib/active-playback';
import {
    clearTikTokBackgroundResumeIntent,
    rejectTikTokPlayWhileHidden,
    resumeTikTokAfterBackgroundIfNeeded,
    subscribeTikTokVisibilityPlayback,
} from '@/lib/tiktok-room-playback';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useWebSocket } from '@/providers/websocket-provider';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * TV/laptop host TikTok visibility:
 * - reject play while hidden (sync pause so remotes don't drift)
 * - auto-resume when tab visible after a tab-hidden pause
 */
export function useTikTokHiddenPlayGuard(): void {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const roomIsPlaying = useYouTubeStore((s) => s.room?.isPlaying ?? false);
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const { ensureConnectedAndSend } = useWebSocket();

    const playingNowId = playingNow?.id;
    const isTikTokHost =
        effectiveLayoutMode !== 'remote' &&
        Boolean(roomId && playingNow && isTikTokPlayback({ video: playingNow }));

    useEffect(() => {
        if (!isTikTokHost || !playingNowId) {
            return;
        }
        clearTikTokBackgroundResumeIntent();
    }, [isTikTokHost, playingNowId]);

    useEffect(() => {
        if (!isTikTokHost || !playingNowId) {
            return;
        }
        if (!roomIsPlaying) {
            return;
        }

        rejectTikTokPlayWhileHidden({
            videoId: playingNowId,
            ensureConnectedAndSend,
        });
    }, [isTikTokHost, playingNowId, roomIsPlaying, ensureConnectedAndSend]);

    useEffect(() => {
        if (!isTikTokHost || !playingNowId) {
            return;
        }

        const unsubscribe = subscribeTikTokVisibilityPlayback({
            videoId: playingNowId,
            ensureConnectedAndSend,
        });

        resumeTikTokAfterBackgroundIfNeeded({
            videoId: playingNowId,
            ensureConnectedAndSend,
        });

        return unsubscribe;
    }, [isTikTokHost, playingNowId, ensureConnectedAndSend]);
}
