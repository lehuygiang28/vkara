import { useEffect } from 'react';

import { isTikTokVideo, isVideoLive } from '@vkara/tiktok';

import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { getRelatedVideos } from '@/services/youtube-api';
import { useYouTubeStore } from '@/store/youtubeStore';

export function usePublishAutoPlayCandidate(): void {
    const forVideoId = useYouTubeStore((s) => {
        const room = s.room;
        const playingNow = room?.playingNow;
        if (
            !room?.autoPlayNext ||
            room.videoQueue.length > 0 ||
            !playingNow ||
            isTikTokVideo(playingNow) ||
            isVideoLive({ video: playingNow }) ||
            room.autoPlayCandidate?.forVideoId === playingNow.id
        ) {
            return null;
        }
        return playingNow.id;
    });

    useEffect(() => {
        if (!forVideoId) {
            return;
        }
        const controller = new AbortController();
        getRelatedVideos(forVideoId, null, controller.signal)
            .then(({ items }) => {
                if (controller.signal.aborted) {
                    return;
                }
                const video = items.find(
                    (item) =>
                        item.id !== forVideoId && item.isLive !== true && item.source !== 'tiktok',
                );
                if (video) {
                    ensureConnectedAndSend({ type: 'setAutoPlayCandidate', video, forVideoId });
                }
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [forVideoId]);
}
