import type Redis from 'ioredis';
import type { PlaylistDetailsResponse } from '@vkara/youtube';

import { createRedisJsonCache } from '@vkara/cache-redis';

/** Curated / browse previews — balance freshness vs YouTube rate limits. */
export const PLAYLIST_DETAILS_CACHE_TTL_SECONDS = 60 * 60;

const PLAYLIST_DETAILS_CACHE_PREFIX = 'youtube-playlist-details:';

const playlistDetailsJsonCache = createRedisJsonCache<PlaylistDetailsResponse>((parsed) => {
    if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'playlist' in parsed &&
        'videos' in parsed
    ) {
        const candidate = parsed as PlaylistDetailsResponse;
        if (candidate.playlist?.id && Array.isArray(candidate.videos)) {
            return candidate;
        }
    }
    return undefined;
});

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
    return playlistDetailsJsonCache.get(redisClient, cacheKey);
}

export async function setCachedPlaylistDetails(
    redisClient: Redis,
    cacheKey: string,
    details: PlaylistDetailsResponse,
): Promise<void> {
    await playlistDetailsJsonCache.set(
        redisClient,
        cacheKey,
        details,
        PLAYLIST_DETAILS_CACHE_TTL_SECONDS,
    );
}
