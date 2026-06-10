import type Redis from 'ioredis';
import type { PlaylistDetailsResponse } from '@vkara/youtube';
import { isCacheablePlaylistDetails, parseYoutubePlaylistInput } from '@vkara/youtube';

import { createInFlightDedup } from './in-flight-dedup';
import { fetchYoutubePlaylistDetails } from './fetch-playlist-details';
import {
    buildPlaylistDetailsCacheKey,
    readCachedPlaylistDetails,
    setCachedPlaylistDetails,
    storeFullPlaylistDetailsCache,
    type PlaylistDetailsCacheScope,
} from './playlist-details-cache';
import { filterVideosForListPrefilter } from './resolve-embed-playability';

export type PlaylistDetailsResolveMode = 'cached' | 'refresh';

const inFlightByCacheKey = createInFlightDedup<string, PlaylistDetailsResponse>();

function resolveCacheScope(options?: {
    limit?: number;
    fetchAll?: boolean;
    videoLimit?: number;
}): PlaylistDetailsCacheScope {
    const videoLimit = options?.videoLimit ?? options?.limit ?? 200;
    const fetchAll =
        options?.fetchAll ?? (options?.videoLimit === undefined && options?.limit === undefined);
    return { videoLimit, fetchAll };
}

async function servePlaylistDetails(
    redisClient: Redis,
    details: PlaylistDetailsResponse,
): Promise<PlaylistDetailsResponse> {
    const videos = await filterVideosForListPrefilter(redisClient, details.videos);
    return { ...details, videos };
}

async function writePlaylistDetailsCache(
    redisClient: Redis,
    listId: string,
    scope: PlaylistDetailsCacheScope,
    details: PlaylistDetailsResponse,
): Promise<void> {
    if (!isCacheablePlaylistDetails(details)) {
        return;
    }

    if (scope.fetchAll) {
        await storeFullPlaylistDetailsCache(redisClient, details);
        return;
    }

    await setCachedPlaylistDetails(
        redisClient,
        buildPlaylistDetailsCacheKey(listId, scope),
        details,
    );
}

export async function resolvePlaylistDetails(
    redisClient: Redis,
    playlistUrlOrId: string,
    options?: {
        limit?: number;
        fetchAll?: boolean;
        videoLimit?: number;
        mode?: PlaylistDetailsResolveMode;
    },
): Promise<PlaylistDetailsResponse> {
    const parsed = parseYoutubePlaylistInput(playlistUrlOrId);
    const scope = resolveCacheScope(options);
    const mode = options?.mode ?? 'cached';
    const cacheKey = buildPlaylistDetailsCacheKey(parsed.listId, scope);

    if (mode === 'refresh') {
        const details = await fetchYoutubePlaylistDetails(playlistUrlOrId, options);
        await storeFullPlaylistDetailsCache(redisClient, details);
        return servePlaylistDetails(redisClient, details);
    }

    const cached = await readCachedPlaylistDetails(redisClient, parsed.listId, scope);
    if (cached) {
        return servePlaylistDetails(redisClient, cached);
    }

    return inFlightByCacheKey.run(cacheKey, async () => {
        const cachedAgain = await readCachedPlaylistDetails(redisClient, parsed.listId, scope);
        if (cachedAgain) {
            return servePlaylistDetails(redisClient, cachedAgain);
        }

        const details = await fetchYoutubePlaylistDetails(playlistUrlOrId, options);
        await writePlaylistDetailsCache(redisClient, parsed.listId, scope, details);
        return servePlaylistDetails(redisClient, details);
    });
}

/** @deprecated Use {@link resolvePlaylistDetails}. Kept for existing route imports. */
export const fetchYoutubePlaylistDetailsCached = resolvePlaylistDetails;
