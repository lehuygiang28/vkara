import type Redis from 'ioredis';
import type { PlaylistDetailsResponse } from '@vkara/shared-types';

/** Curated / browse previews — balance freshness vs YouTube rate limits. */
export const PLAYLIST_DETAILS_CACHE_TTL_SECONDS = 60 * 60;

const PLAYLIST_DETAILS_CACHE_PREFIX = 'youtube-playlist-details:';

export type PlaylistDetailsCacheOptions = {
    videoLimit: number;
    fetchAll: boolean;
};

export function buildPlaylistDetailsCacheKey(
    listId: string,
    options: PlaylistDetailsCacheOptions,
): string {
    const scope = options.fetchAll ? 'all' : `limit:${options.videoLimit}`;
    return `${PLAYLIST_DETAILS_CACHE_PREFIX}${listId}:${scope}`;
}

export async function getCachedPlaylistDetails(
    redisClient: Redis,
    cacheKey: string,
): Promise<PlaylistDetailsResponse | undefined> {
    const payload = await redisClient.get(cacheKey);
    if (!payload) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(payload) as PlaylistDetailsResponse;
        if (!parsed?.playlist?.id || !Array.isArray(parsed.videos)) {
            return undefined;
        }
        return parsed;
    } catch {
        return undefined;
    }
}

export async function setCachedPlaylistDetails(
    redisClient: Redis,
    cacheKey: string,
    details: PlaylistDetailsResponse,
): Promise<void> {
    await redisClient.set(
        cacheKey,
        JSON.stringify(details),
        'EX',
        PLAYLIST_DETAILS_CACHE_TTL_SECONDS,
    );
}
