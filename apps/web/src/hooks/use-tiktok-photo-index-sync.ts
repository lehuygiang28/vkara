'use client';

import { useEffect } from 'react';

import { useWebSocket } from '@/providers/websocket-provider';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
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
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const roomId = useYouTubeStore((s) => s.room?.id);
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const playingNowId = playingNow?.id;
    const isPhotoPost = playingNow ? isTikTokPhotoPost({ video: playingNow }) : false;
    const { ensureConnectedAndSend } = useWebSocket();
    const isRoomSessionReady = useIsRoomSessionReady();

    useEffect(() => {
        if (effectiveLayoutMode === 'remote') {
            return;
        }
        if (!roomId || !isRoomSessionReady || !playingNowId || !isPhotoPost) {
            setTikTokPhotoImageChangeHandler(null);
            return;
        }

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
    }, [
        effectiveLayoutMode,
        roomId,
        isRoomSessionReady,
        playingNowId,
        isPhotoPost,
        ensureConnectedAndSend,
    ]);
}
