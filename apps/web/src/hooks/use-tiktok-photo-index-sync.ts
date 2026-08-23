'use client';

import { useEffect } from 'react';

import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';
import { useYouTubeStore } from '@/store/youtubeStore';
import {
    getTikTokPhotoMaxImageIndex,
    setTikTokPhotoImageChangeHandler,
} from '@/lib/tiktok-playback-sync';
import { selectTikTokPhotoSyncPlayingNowId } from '@/lib/tiktok-host-store-selectors';

/**
 * TV / laptop player reports TikTok photo carousel index to the room so remotes stay in sync.
 *
 * `playingNowId` is a primitive so zustand Object.is stays stable (see hidden-play-guard).
 */
export function useTikTokPhotoIndexSync(): void {
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);
    const isHostPlayer = layoutModeSource === 'url' || layoutModeSource === 'user';

    const photoPlayingNowId = useYouTubeStore(selectTikTokPhotoSyncPlayingNowId);
    const isRoomSessionReady = useIsRoomSessionReady();

    useEffect(() => {
        if (!isHostPlayer) {
            setTikTokPhotoImageChangeHandler(null);
            return;
        }
        if (!photoPlayingNowId || !isRoomSessionReady) {
            setTikTokPhotoImageChangeHandler(null);
            return;
        }

        setTikTokPhotoImageChangeHandler((index) => {
            ensureConnectedAndSend({
                type: 'syncTikTokPhotoIndex',
                index,
                maxIndex: getTikTokPhotoMaxImageIndex(),
                videoId: photoPlayingNowId,
            });
        });

        return () => {
            setTikTokPhotoImageChangeHandler(null);
        };
    }, [isHostPlayer, photoPlayingNowId, isRoomSessionReady]);
}
