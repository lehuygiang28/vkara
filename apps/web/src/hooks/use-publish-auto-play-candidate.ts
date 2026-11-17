import { useEffect } from 'react';

import { isTikTokVideo, isVideoLive } from '@vkara/tiktok';

import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { checkEmbeddableStatus, getRelatedVideos } from '@/services/youtube-api';
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
            .then(async ({ items }) => {
                if (controller.signal.aborted) {
                    return;
                }
                const eligible = items
                    .filter(
                        (item) =>
                            item.id !== forVideoId &&
                            item.isLive !== true &&
                            item.source !== 'tiktok',
                    )
                    .slice(0, 8);
                if (eligible.length === 0) {
                    return;
                }
                let video = eligible[0];
                try {
                    const statuses = await checkEmbeddableStatus(eligible.map((item) => item.id));
                    if (controller.signal.aborted) {
                        return;
                    }
                    const embeddableIds = new Set(
                        statuses
                            .filter((status) => status.canEmbed)
                            .map((status) => status.videoId),
                    );
                    const match = eligible.find((item) => embeddableIds.has(item.id));
                    if (!match) {
                        return;
                    }
                    video = match;
                } catch {
                    if (controller.signal.aborted) {
                        return;
                    }
                }
                ensureConnectedAndSend({ type: 'setAutoPlayCandidate', video, forVideoId });
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [forVideoId]);
}
