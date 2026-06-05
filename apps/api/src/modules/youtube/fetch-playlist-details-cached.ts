import type Redis from 'ioredis';
import type { PlaylistDetailsResponse } from '@vkara/youtube';
import { isCacheablePlaylistDetails, parseYoutubePlaylistInput } from '@vkara/youtube';

import { createInFlightDedup } from './in-flight-dedup';
import { fetchYoutubePlaylistDetails } from './fetch-playlist-details';
import {
    buildPlaylistDetailsCacheKey,
    getCachedPlaylistDetails,
    setCachedPlaylistDetails,
    type PlaylistDetailsCacheOptions,
} from './playlist-details-cache';
import { filterVideosForListPrefilter } from './resolve-embed-playability';

const inFlightByCacheKey = createInFlightDedup<string, PlaylistDetailsResponse>();

function resolveCacheOptions(options?: {
    limit?: number;
    fetchAll?: boolean;
    videoLimit?: number;
}): PlaylistDetailsCacheOptions {
    const videoLimit = options?.videoLimit ?? options?.limit ?? 200;
    const fetchAll = options?.fetchAll ?? options?.videoLimit === undefined;
    return { videoLimit, fetchAll };
}

async function servePlaylistDetails(
    redisClient: Redis,
    details: PlaylistDetailsResponse,
): Promise<PlaylistDetailsResponse> {
    const videos = await filterVideosForListPrefilter(redisClient, details.videos);
    return { ...details, videos };
}

export async function fetchYoutubePlaylistDetailsCached(
    redisClient: Redis,
    playlistUrlOrId: string,
    options?: { limit?: number; fetchAll?: boolean; videoLimit?: number },
): Promise<PlaylistDetailsResponse> {
    const parsed = parseYoutubePlaylistInput(playlistUrlOrId);
    const cacheOptions = resolveCacheOptions(options);
    const cacheKey = buildPlaylistDetailsCacheKey(parsed.listId, cacheOptions);

    const cached = await getCachedPlaylistDetails(redisClient, cacheKey);
    if (cached && isCacheablePlaylistDetails(cached)) {
        return servePlaylistDetails(redisClient, cached);
    }

    return inFlightByCacheKey.run(cacheKey, async () => {
        const cachedAgain = await getCachedPlaylistDetails(redisClient, cacheKey);
        if (cachedAgain && isCacheablePlaylistDetails(cachedAgain)) {
            return servePlaylistDetails(redisClient, cachedAgain);
        }

        const details = await fetchYoutubePlaylistDetails(playlistUrlOrId, options);
        if (isCacheablePlaylistDetails(details)) {
            await setCachedPlaylistDetails(redisClient, cacheKey, details);
        }
        return servePlaylistDetails(redisClient, details);
    });
}
