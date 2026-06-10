import type Redis from 'ioredis';
import type {
    PlaylistDetailsResponse,
    YoutubePlaylistMetadata,
    YouTubeChannel,
    YouTubeThumbnailVariant,
    YouTubeVideo,
} from '@vkara/youtube';

import { isCacheablePlaylistDetails } from '@vkara/youtube';
import { createRedisJsonCache } from '@vkara/cache-redis';

/** Curated / browse previews — balance freshness vs YouTube rate limits. */
export const PLAYLIST_DETAILS_CACHE_TTL_SECONDS = 6 * 60 * 60;

const PLAYLIST_DETAILS_CACHE_PREFIX = 'youtube-playlist-details:';

function parseThumbnailVariant(value: unknown): YouTubeThumbnailVariant | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.url !== 'string' || candidate.url === '') {
        return undefined;
    }

    const thumbnail: YouTubeThumbnailVariant = { url: candidate.url };
    if (typeof candidate.width === 'number') {
        thumbnail.width = candidate.width;
    }
    if (typeof candidate.height === 'number') {
        thumbnail.height = candidate.height;
    }
    return thumbnail;
}

function parseYoutubeChannel(value: unknown): YouTubeChannel | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.name !== 'string' || typeof candidate.verified !== 'boolean') {
        return undefined;
    }

    return { name: candidate.name, verified: candidate.verified };
}

function parseYoutubePlaylistMetadata(value: unknown): YoutubePlaylistMetadata | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    if (
        typeof candidate.id !== 'string' ||
        candidate.id === '' ||
        typeof candidate.title !== 'string' ||
        typeof candidate.videoCount !== 'number' ||
        !Number.isFinite(candidate.videoCount)
    ) {
        return undefined;
    }

    const playlist: YoutubePlaylistMetadata = {
        id: candidate.id,
        title: candidate.title,
        videoCount: candidate.videoCount,
    };

    if (typeof candidate.channelName === 'string') {
        playlist.channelName = candidate.channelName;
    }

    if (Array.isArray(candidate.thumbnails)) {
        const thumbnails = candidate.thumbnails
            .map(parseThumbnailVariant)
            .filter((item): item is YouTubeThumbnailVariant => item !== undefined);
        if (thumbnails.length > 0) {
            playlist.thumbnails = thumbnails;
        }
    }

    return playlist;
}

function parseCachedYouTubeVideo(value: unknown): YouTubeVideo | undefined {
    if (typeof value !== 'object' || value === null) {
        return undefined;
    }

    const candidate = value as Record<string, unknown>;
    if (
        typeof candidate.id !== 'string' ||
        candidate.id === '' ||
        typeof candidate.title !== 'string' ||
        typeof candidate.duration !== 'number' ||
        typeof candidate.duration_formatted !== 'string' ||
        typeof candidate.type !== 'string' ||
        typeof candidate.uploadedAt !== 'string' ||
        typeof candidate.url !== 'string' ||
        typeof candidate.views !== 'number' ||
        !Array.isArray(candidate.channels) ||
        !Array.isArray(candidate.thumbnails)
    ) {
        return undefined;
    }

    const channels = candidate.channels
        .map(parseYoutubeChannel)
        .filter((item): item is YouTubeChannel => item !== undefined);
    const thumbnails = candidate.thumbnails
        .map(parseThumbnailVariant)
        .filter((item): item is YouTubeThumbnailVariant => item !== undefined);

    if (channels.length === 0 || thumbnails.length === 0) {
        return undefined;
    }

    const video: YouTubeVideo = {
        id: candidate.id,
        title: candidate.title,
        duration: candidate.duration,
        duration_formatted: candidate.duration_formatted,
        type: candidate.type,
        uploadedAt: candidate.uploadedAt,
        url: candidate.url,
        views: candidate.views,
        channels,
        thumbnails,
    };

    if (typeof candidate.isLive === 'boolean') {
        video.isLive = candidate.isLive;
    }

    return video;
}

function parsePlaylistDetailsResponse(parsed: unknown): PlaylistDetailsResponse | undefined {
    if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
    }

    const candidate = parsed as Record<string, unknown>;
    const playlist = parseYoutubePlaylistMetadata(candidate.playlist);
    if (!playlist || !Array.isArray(candidate.videos)) {
        return undefined;
    }

    const videos: YouTubeVideo[] = [];
    for (const item of candidate.videos) {
        const video = parseCachedYouTubeVideo(item);
        if (!video) {
            return undefined;
        }
        videos.push(video);
    }

    return { playlist, videos };
}

const playlistDetailsJsonCache = createRedisJsonCache<PlaylistDetailsResponse>(
    parsePlaylistDetailsResponse,
);

export type PlaylistDetailsCacheScope = {
    videoLimit: number;
    fetchAll: boolean;
};

export function buildPlaylistDetailsCacheKey(
    listId: string,
    scope: PlaylistDetailsCacheScope,
): string {
    const cacheScope = scope.fetchAll ? 'all' : `limit:${scope.videoLimit}`;
    return `${PLAYLIST_DETAILS_CACHE_PREFIX}${listId}:${cacheScope}`;
}

export function buildFullPlaylistCacheKey(listId: string): string {
    return buildPlaylistDetailsCacheKey(listId, { fetchAll: true, videoLimit: 200 });
}

export function slicePlaylistDetails(
    details: PlaylistDetailsResponse,
    videoLimit: number,
): PlaylistDetailsResponse {
    return {
        playlist: details.playlist,
        videos: details.videos.slice(0, videoLimit),
    };
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

export async function storeFullPlaylistDetailsCache(
    redisClient: Redis,
    details: PlaylistDetailsResponse,
): Promise<void> {
    if (!isCacheablePlaylistDetails(details)) {
        return;
    }

    await setCachedPlaylistDetails(
        redisClient,
        buildFullPlaylistCacheKey(details.playlist.id),
        details,
    );
}

export async function readCachedPlaylistDetails(
    redisClient: Redis,
    listId: string,
    scope: PlaylistDetailsCacheScope,
): Promise<PlaylistDetailsResponse | undefined> {
    const scoped = await getCachedPlaylistDetails(
        redisClient,
        buildPlaylistDetailsCacheKey(listId, scope),
    );
    if (scoped && isCacheablePlaylistDetails(scoped)) {
        return scoped;
    }

    if (scope.fetchAll) {
        return undefined;
    }

    const full = await getCachedPlaylistDetails(redisClient, buildFullPlaylistCacheKey(listId));
    if (!full || !isCacheablePlaylistDetails(full)) {
        return undefined;
    }

    const sliced = slicePlaylistDetails(full, scope.videoLimit);
    if (!isCacheablePlaylistDetails(sliced)) {
        return undefined;
    }

    return sliced;
}
