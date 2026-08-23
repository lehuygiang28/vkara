'use client';

import { useEffect } from 'react';

import {
    clearTikTokBackgroundResumeIntent,
    rejectTikTokPlayWhileHidden,
    resumeTikTokAfterBackgroundIfNeeded,
    subscribeTikTokVisibilityPlayback,
} from '@/lib/tiktok-room-playback';
import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import {
    selectTikTokHostIsPlaying,
    selectTikTokHostPlayingNowId,
} from '@/lib/tiktok-host-store-selectors';
import { useYouTubeStore } from '@/store/youtubeStore';

/**
 * TV/laptop host TikTok visibility:
 * - reject play while hidden (sync pause so remotes don't drift)
 * - auto-resume when tab visible after a tab-hidden pause
 *
 * Subscribe to primitives only. An object snapshot (`{ playingNowId, roomIsPlaying }`)
 * fails zustand Object.is on every store tick and triggers React error #185
 * (max update depth) whenever a TikTok clip is playingNow — the page then
 * error-boundary reloads in a loop.
 */
export function useTikTokHiddenPlayGuard(): void {
    const tiktokPlayingNowId = useYouTubeStore(selectTikTokHostPlayingNowId);
    const tiktokRoomIsPlaying = useYouTubeStore(selectTikTokHostIsPlaying);

    useEffect(() => {
        if (!tiktokPlayingNowId) {
            return;
        }
        clearTikTokBackgroundResumeIntent();
    }, [tiktokPlayingNowId]);

    useEffect(() => {
        if (!tiktokPlayingNowId || !tiktokRoomIsPlaying) {
            return;
        }

        rejectTikTokPlayWhileHidden({
            videoId: tiktokPlayingNowId,
            ensureConnectedAndSend,
        });
    }, [tiktokPlayingNowId, tiktokRoomIsPlaying]);

    useEffect(() => {
        if (!tiktokPlayingNowId) {
            return;
        }

        const unsubscribe = subscribeTikTokVisibilityPlayback({
            videoId: tiktokPlayingNowId,
            ensureConnectedAndSend,
        });

        resumeTikTokAfterBackgroundIfNeeded({
            videoId: tiktokPlayingNowId,
            ensureConnectedAndSend,
        });

        return unsubscribe;
    }, [tiktokPlayingNowId]);
}
