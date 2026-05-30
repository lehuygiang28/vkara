import type { Client, VideoCompact } from 'youtubei';

import { coerceViewCount, resolveYoutubeLiveFlag } from '@vkara/shared-utils';

import { createContextLogger } from '@/utils/logger';

import { postInnertube } from './innertube-post';

const logger = createContextLogger('LiveViewers');

/** Live concurrent viewer counts change quickly; keep cache short. */
const CACHE_TTL_MS = 30_000;

const liveViewerCache = new Map<string, { value: number; expiresAt: number }>();

type PlayerResponsePayload = {
    videoDetails?: { viewCount?: string | number };
    microformat?: { playerMicroformatRenderer?: { viewCount?: string | number } };
};

const extractLiveViewerCount = (data: unknown): number => {
    const payload = data as PlayerResponsePayload;
    return coerceViewCount(
        payload?.videoDetails?.viewCount ??
            payload?.microformat?.playerMicroformatRenderer?.viewCount,
    );
};

/**
 * InnerTube search often omits "X watching" for live videos.
 * The player endpoint exposes concurrent viewers as videoDetails.viewCount.
 */
export async function fetchLiveViewerCount(
    client: Client,
    videoId: string,
): Promise<number | null> {
    const cached = liveViewerCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    try {
        const response = await postInnertube(client, '/youtubei/v1/player', { videoId });
        const count = extractLiveViewerCount(response?.data);
        if (count > 0) {
            liveViewerCache.set(videoId, {
                value: count,
                expiresAt: Date.now() + CACHE_TTL_MS,
            });
            return count;
        }

        logger.debug('Live viewer count missing from player response', { videoId });
    } catch (error) {
        logger.debug('Failed to fetch live viewer count', { videoId, error });
    }

    return null;
}

/** Prefetch before heavy per-item work so player calls are not starved by getVideo() storms. */
export async function prefetchLiveViewerCounts(
    client: Client,
    items: VideoCompact[],
): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const liveIds = [
        ...new Set(
            items
                .filter((item) =>
                    resolveYoutubeLiveFlag({
                        isLive: item.isLive,
                        duration: item.duration,
                        uploadDate: item.uploadDate,
                    }),
                )
                .map((item) => item.id),
        ),
    ];

    if (liveIds.length === 0) {
        return counts;
    }

    await Promise.all(
        liveIds.map(async (videoId) => {
            const count = await fetchLiveViewerCount(client, videoId);
            if (count) {
                counts.set(videoId, count);
            }
        }),
    );

    return counts;
}
