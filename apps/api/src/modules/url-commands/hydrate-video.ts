import type Redis from 'ioredis';
import type { YouTubeVideo } from '@vkara/youtube';

import { assertYoutubeCircuitClosed, recordYoutubeFailure } from './http-guardrails';

export const HYDRATE_CACHE_TTL_SECONDS = 600;
export const HYDRATE_TIMEOUT_MS = 3000;

export type VideoSearchFn = (query: string) => Promise<YouTubeVideo[]>;

function hydrateCacheKey(videoId: string): string {
    return `hydrate:${videoId}`;
}

export async function hydrateVideoById(
    redis: Redis,
    videoId: string,
    search: VideoSearchFn,
): Promise<YouTubeVideo | null> {
    const trimmed = videoId.trim();
    if (!trimmed) {
        return null;
    }

    await assertYoutubeCircuitClosed(redis);

    const cached = await redis.get(hydrateCacheKey(trimmed));
    if (cached) {
        try {
            return JSON.parse(cached) as YouTubeVideo;
        } catch {
            await redis.del(hydrateCacheKey(trimmed));
        }
    }

    try {
        const items = await Promise.race([
            search(trimmed),
            new Promise<YouTubeVideo[]>((_, reject) => {
                setTimeout(() => reject(new Error('hydrate timeout')), HYDRATE_TIMEOUT_MS);
            }),
        ]);
        const video = items.find((item) => item.id === trimmed) ?? null;
        if (video) {
            await redis.set(hydrateCacheKey(trimmed), JSON.stringify(video), 'EX', HYDRATE_CACHE_TTL_SECONDS);
        }
        return video;
    } catch {
        await recordYoutubeFailure(redis);
        return null;
    }
}
