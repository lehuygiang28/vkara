import type { Client, VideoCompact } from 'youtubei';
import type Redis from 'ioredis';

import type { YouTubeVideo } from '@vkara/youtube';
import { createContextLogger } from '@/utils/logger';

import { setCachedChannel } from './channel-cache';
import { prefetchUniqueChannelVerified } from './channel-verified';
import { prefetchLiveViewerCounts } from './live-viewers';
import {
    collectCompactChannelCandidates,
    resolveCompactVideoChannels,
} from './resolve-compact-channels';
import { resolveItemViews } from './resolve-item-views';
import type { RendererMetadataMaps } from './renderer-metadata';
import { filterVideosForListPrefilter } from './resolve-embed-playability';
import { mapYoutubeiVideo } from './video-mapper';
import { isPlayableYoutubeVideo, isSearchResultVideo } from './video-validation';

const logger = createContextLogger('PrepareYoutubeVideos');

type ResolvedChannel = Awaited<ReturnType<typeof resolveCompactVideoChannels>>[number];

export type YoutubeRendererMetadata = Pick<
    RendererMetadataMaps,
    'verifiedByVideoId' | 'viewCountByVideoId'
>;

/** Drop channel rows, playlists, and other non-playable compact entries. */
function filterVideoCompactItems(items: VideoCompact[]): VideoCompact[] {
    return items.filter((item) => {
        if (isSearchResultVideo(item)) {
            return true;
        }

        logger.debug('Skipping non-video compact item', {
            id: item.id,
            title: item.title,
        });
        return false;
    });
}

function applyVerifiedFromMetadata(
    channels: ResolvedChannel[],
    videoId: string,
    metadata: YoutubeRendererMetadata,
): ResolvedChannel[] {
    const isVerified = metadata.verifiedByVideoId.get(videoId);
    if (typeof isVerified !== 'boolean') {
        return channels;
    }

    return channels.map((channel, index) =>
        index === 0 ? { ...channel, verified: channel.verified || isVerified } : channel,
    );
}

async function cacheResolvedChannels(
    redisClient: Redis,
    channels: ResolvedChannel[],
): Promise<void> {
    await Promise.all(
        channels
            .filter((channel) => Boolean(channel.id))
            .map((channel) =>
                setCachedChannel(redisClient, {
                    id: channel.id!,
                    name: channel.name,
                    verified: channel.verified,
                }),
            ),
    );
}

/**
 * Shared pipeline for /search and /related:
 * validate → prefetch channels/live → map → optional embed prefilter (feature flag).
 * WebSocket add/play always re-checks embeddability (Redis-backed).
 *
 * TODO(phase-2): Wire playlist import through here for views/verified (rate-limit research).
 */
export async function prepareYoutubeVideos(
    client: Client,
    redisClient: Redis,
    items: VideoCompact[],
    metadata: YoutubeRendererMetadata,
): Promise<YouTubeVideo[]> {
    const videoItems = filterVideoCompactItems(items);
    if (videoItems.length === 0) {
        return [];
    }

    await prefetchUniqueChannelVerified(
        redisClient,
        client,
        collectCompactChannelCandidates(videoItems, metadata.verifiedByVideoId),
    );

    const liveViewerCounts = await prefetchLiveViewerCounts(client, videoItems);

    const prepared = await Promise.all(
        videoItems.map(async (item) => {
            const metadataVerified = metadata.verifiedByVideoId.get(item.id);
            const channels = await resolveCompactVideoChannels(
                item,
                redisClient,
                metadataVerified,
                client,
            );
            const resolvedChannels = applyVerifiedFromMetadata(channels, item.id, metadata);
            await cacheResolvedChannels(redisClient, resolvedChannels);

            return mapYoutubeiVideo(item, {
                channels: resolvedChannels.map(({ name, verified }) => ({
                    name,
                    verified,
                })),
                views: await resolveItemViews(client, item, metadata, liveViewerCounts),
            });
        }),
    );

    const playable = prepared.filter((video) => isPlayableYoutubeVideo(video));
    return filterVideosForListPrefilter(redisClient, playable);
}
