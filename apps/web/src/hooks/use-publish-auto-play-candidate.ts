import { useEffect } from 'react';

import { isTikTokVideo, isVideoLive } from '@vkara/tiktok';
import type { YouTubeVideo } from '@vkara/youtube';

import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { checkEmbeddableStatus, getRelatedVideos } from '@/services/youtube-api';
import { useYouTubeStore } from '@/store/youtubeStore';

const RELATED_ATTEMPTS = 2;
const RELATED_TIMEOUT_MS = 8_000;

function startAttempt(parent: AbortSignal): { signal: AbortSignal; stop: () => void } {
    const attempt = new AbortController();
    const timer = setTimeout(() => attempt.abort(), RELATED_TIMEOUT_MS);
    const abortAttempt = () => attempt.abort();
    if (parent.aborted) {
        abortAttempt();
    } else {
        parent.addEventListener('abort', abortAttempt, { once: true });
    }
    return {
        signal: attempt.signal,
        stop: () => {
            clearTimeout(timer);
            parent.removeEventListener('abort', abortAttempt);
        },
    };
}

async function publishRelatedCandidate(forVideoId: string, parent: AbortSignal): Promise<void> {
    for (let attempt = 0; attempt < RELATED_ATTEMPTS; attempt += 1) {
        if (parent.aborted) {
            return;
        }
        const current = startAttempt(parent);
        try {
            const { items } = await getRelatedVideos(forVideoId, null, current.signal);
            if (parent.aborted) {
                return;
            }
            const sent = await sendFirstEmbeddable(items, forVideoId, parent);
            if (sent !== 'failed') {
                return;
            }
        } catch {
            if (parent.aborted || attempt === RELATED_ATTEMPTS - 1) {
                return;
            }
        } finally {
            current.stop();
        }
    }
}

async function sendFirstEmbeddable(
    items: YouTubeVideo[],
    forVideoId: string,
    parent: AbortSignal,
): Promise<'sent' | 'empty' | 'failed'> {
    const eligible = items
        .filter(
            (item) => item.id !== forVideoId && item.isLive !== true && item.source !== 'tiktok',
        )
        .slice(0, 8);
    if (eligible.length === 0) {
        return 'empty';
    }
    let video = eligible[0];
    try {
        const statuses = await checkEmbeddableStatus(eligible.map((item) => item.id));
        if (parent.aborted) {
            return 'failed';
        }
        const embeddableIds = new Set(
            statuses.filter((status) => status.canEmbed).map((status) => status.videoId),
        );
        const match = eligible.find((item) => embeddableIds.has(item.id));
        if (!match) {
            return 'empty';
        }
        video = match;
    } catch {
        if (parent.aborted) {
            return 'failed';
        }
    }
    ensureConnectedAndSend({ type: 'setAutoPlayCandidate', video, forVideoId });
    return 'sent';
}

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
        void publishRelatedCandidate(forVideoId, controller.signal);
        return () => controller.abort();
    }, [forVideoId]);
}
