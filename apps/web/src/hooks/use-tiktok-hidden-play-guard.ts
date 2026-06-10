'use client';

import { useEffect } from 'react';

import { isTikTokPlayback } from '@/lib/active-playback';
import {
    clearTikTokBackgroundResumeIntent,
    rejectTikTokPlayWhileHidden,
    resumeTikTokAfterBackgroundIfNeeded,
    subscribeTikTokVisibilityPlayback,
} from '@/lib/tiktok-room-playback';
import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * TV/laptop host TikTok visibility:
 * - reject play while hidden (sync pause so remotes don't drift)
 * - auto-resume when tab visible after a tab-hidden pause
 */
export function useTikTokHiddenPlayGuard(): void {
    const tiktokHostContext = useYouTubeStore((s) => {
        const roomId = s.room?.id;
        const playingNow = s.room?.playingNow;
        if (!roomId || !playingNow || !isTikTokPlayback({ video: playingNow })) {
            return null;
        }
        return {
            playingNowId: playingNow.id,
            roomIsPlaying: s.room?.isPlaying ?? false,
        };
    });

    useEffect(() => {
        if (!tiktokHostContext) {
            return;
        }
        clearTikTokBackgroundResumeIntent();
    }, [tiktokHostContext?.playingNowId, tiktokHostContext]);

    useEffect(() => {
        if (!tiktokHostContext?.roomIsPlaying) {
            return;
        }

        rejectTikTokPlayWhileHidden({
            videoId: tiktokHostContext.playingNowId,
            ensureConnectedAndSend,
        });
    }, [tiktokHostContext]);

    useEffect(() => {
        if (!tiktokHostContext) {
            return;
        }

        const unsubscribe = subscribeTikTokVisibilityPlayback({
            videoId: tiktokHostContext.playingNowId,
            ensureConnectedAndSend,
        });

        resumeTikTokAfterBackgroundIfNeeded({
            videoId: tiktokHostContext.playingNowId,
            ensureConnectedAndSend,
        });

        return unsubscribe;
    }, [tiktokHostContext]);
}
