'use client';

import { useEffect } from 'react';

import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { useIsRoomSessionReady } from '@/hooks/use-room-session-ready';
import { useYouTubeStore } from '@/store/youtubeStore';
import {
    getTikTokPhotoMaxImageIndex,
    setTikTokPhotoImageChangeHandler,
} from '@/lib/tiktok-playback-sync';
import { isTikTokPhotoPost } from '@vkara/tiktok';

/**
 * TV / laptop player reports TikTok photo carousel index to the room so remotes stay in sync.
 */
export function useTikTokPhotoIndexSync(): void {
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);
    const isHostPlayer = layoutModeSource === 'url' || layoutModeSource === 'user';

    const photoSyncContext = useYouTubeStore((s) => {
        const roomId = s.room?.id;
        const playingNow = s.room?.playingNow;
        if (!roomId || !playingNow || !isTikTokPhotoPost({ video: playingNow })) {
            return null;
        }
        return { roomId, playingNowId: playingNow.id };
    });

    const isRoomSessionReady = useIsRoomSessionReady();

    useEffect(() => {
        if (!isHostPlayer) {
            setTikTokPhotoImageChangeHandler(null);
            return;
        }
        if (!photoSyncContext || !isRoomSessionReady) {
            setTikTokPhotoImageChangeHandler(null);
            return;
        }

        const { playingNowId } = photoSyncContext;
        setTikTokPhotoImageChangeHandler((index) => {
            ensureConnectedAndSend({
                type: 'syncTikTokPhotoIndex',
                index,
                maxIndex: getTikTokPhotoMaxImageIndex(),
                videoId: playingNowId,
            });
        });

        return () => {
            setTikTokPhotoImageChangeHandler(null);
        };
    }, [isHostPlayer, photoSyncContext, isRoomSessionReady]);
}
