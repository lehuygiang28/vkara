import { Elysia, t } from 'elysia';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { Client, type VideoCompact, type SearchResult, type VideoRelated } from 'youtubei';
import youtube from 'youtube-sr';
import { createRedisOptions } from '@vkara/shared-infra';

import { createContextLogger } from '@/utils/logger';
import type { YouTubeVideo } from '@vkara/shared-types';
import { cleanUpVideoField } from './utils/common';
import {
    cleanupOldInstances,
    getRedisKey,
    REDIS_KEY_PREFIXES,
    relatedInstances,
    searchInstances,
    storeContinuation,
} from './modules/youtube/cache';
import { mapYoutubeiVideo } from './modules/youtube/video-mapper';
import { checkEmbeddable } from './modules/youtube/embeddable';
import { getRelatedVerifiedMap, getSearchVerifiedMap } from './modules/youtube/verified-badges';
import { setCachedChannel } from './modules/youtube/channel-cache';
import { enrichChannelsVerified } from './modules/youtube/channel-verified';

const logger = createContextLogger('Search-Youtubei');
const youtubeiLogger = createContextLogger('Queue/Youtubei');

// const response = await OAuth.authorize();
const youtubei = new Client({
    oauth: {
        enabled: false,
        // refreshToken: response.refreshToken,
    },
});

const redisConnectionOptions = createRedisOptions(process.env);
const redis = new Redis(redisConnectionOptions);

// Create the cleanup queue
const cleanupQueue = new Queue('search-instance-cleanup', { connection: redisConnectionOptions });

// Create a worker to process cleanup jobs
const worker = new Worker(
    'search-instance-cleanup',
    async () => {
        await cleanupOldInstances();
    },
    { connection: redisConnectionOptions },
);

type ResolvedChannel = YouTubeVideo['channels'][number] & { id?: string };

const isVerifiedChannel = (channel: unknown): boolean => {
    if (!channel || typeof channel !== 'object') {
        return false;
    }

    const candidate = channel as {
        verified?: unknown;
        isVerified?: unknown;
        isOfficialArtistChannel?: unknown;
    };

    return Boolean(
        candidate.verified ?? candidate.isVerified ?? candidate.isOfficialArtistChannel ?? false,
    );
};

const resolveVideoChannels = async (
    video: VideoCompact,
    redisClient: Redis,
    youtubeiClient: Client,
): Promise<ResolvedChannel[]> => {
    try {
        const fullVideo = await video.getVideo();
        const collaboratorChannels = fullVideo.channels
            ?.filter((channel): channel is NonNullable<typeof channel> => Boolean(channel?.name))
            .map((channel) => ({
                id: channel.id,
                name: channel.name,
                verified: isVerifiedChannel(channel),
            }));

        if (collaboratorChannels && collaboratorChannels.length > 0) {
            return enrichChannelsVerified(redisClient, youtubeiClient, collaboratorChannels);
        }

        const primaryChannel = fullVideo.channel?.name
            ? {
                  id: fullVideo.channel.id,
                  name: fullVideo.channel.name,
                  verified: isVerifiedChannel(fullVideo.channel),
              }
            : video.channel?.name
              ? {
                    id: video.channel.id,
                    name: video.channel.name,
                    verified: isVerifiedChannel(video.channel),
                }
              : null;

        if (primaryChannel) {
            return enrichChannelsVerified(redisClient, youtubeiClient, [primaryChannel]);
        }

        return [];
    } catch (error) {
        logger.debug('Failed to resolve video channel from full video payload', {
            videoId: video.id,
            error,
        });

        if (video.channel?.name) {
            const fallback = {
                id: video.channel.id,
                name: video.channel.name,
                verified: isVerifiedChannel(video.channel),
            };
            return enrichChannelsVerified(redisClient, youtubeiClient, [fallback]);
        }

        return [];
    }
};

// Handle worker events
worker.on('completed', (job) => {
    youtubeiLogger.debug(`Cleanup job ${job.id} has completed`, { jobId: job.id });
});

worker.on('failed', (job, error) => {
    youtubeiLogger.error(`Cleanup job ${job?.id} has failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

// Schedule cleanup job to run every 5 minutes
const scheduleCleanupYoutubeiInstance = async () => {
    await cleanupQueue.add(
        'cleanup',
        {},
        {
            repeat: {
                pattern: '*/5 * * * *', // Every 5 minutes
            },
        },
    );
    youtubeiLogger.info('Scheduled recurring cleanup job');
};

export const searchYoutubeiElysia = new Elysia({})
    .onStart(() => {
        logger.info('Starting search-youtubei');
        scheduleCleanupYoutubeiInstance().catch(youtubeiLogger.error);
    })
    .state('youtubeiClient', youtubei)
    .state('redisClient', redis)
    .state('searchInstances', searchInstances)
    .state('relatedInstances', relatedInstances)
    .state('redisKeyPrefixes', REDIS_KEY_PREFIXES)
    .post(
        '/search',
        async ({
            body: { query, continuation },
            store: {
                youtubeiClient,
                redisClient,
                searchInstances: stateSearchInstances,
                redisKeyPrefixes,
            },
        }): Promise<{
            items: YouTubeVideo[];
            continuation?: string | null;
        }> => {
            let results: SearchResult<'video'> | undefined;
            let newItems: VideoCompact[] = [];
            const processedVideoIds = new Set<string>();
            const prefix = redisKeyPrefixes.SEARCH;
            const activeSearchInstances = stateSearchInstances || searchInstances;

            if (
                continuation &&
                (activeSearchInstances.has(continuation) ||
                    (await redisClient.exists(getRedisKey(prefix, continuation))))
            ) {
                logger.info(`Continuing search: "${query}"`);
                if (!activeSearchInstances.has(continuation)) {
                    const timestamp = parseInt(
                        (await redisClient.get(getRedisKey(prefix, continuation))) || '0',
                    );
                    if (timestamp) {
                        results = await youtubeiClient.search(query, {
                            type: 'video',
                            sortBy: 'relevance',
                        });
                        results.continuation = continuation;
                        activeSearchInstances.set(continuation, {
                            instance: results,
                            timestamp: timestamp,
                        });
                    }
                } else {
                    const stored = activeSearchInstances.get(continuation)!;
                    results = stored.instance;
                }

                if (results) {
                    const currentLength = results.items.length;
                    await results.next();
                    const allNewItems = results.items.slice(currentLength);

                    // Filter out duplicate videos
                    newItems = allNewItems.filter((item) => !processedVideoIds.has(item.id));
                    newItems.forEach((item) => processedVideoIds.add(item.id));

                    if (results.continuation) {
                        activeSearchInstances.delete(continuation);
                        await storeContinuation(
                            prefix,
                            results.continuation,
                            activeSearchInstances,
                            results,
                            redisClient,
                        );
                        await redisClient.del(getRedisKey(prefix, continuation));
                    }
                }
            }

            if (!results) {
                logger.info(`New search: "${query}"`);
                results = await youtubeiClient.search(query, {
                    type: 'video',
                    sortBy: 'relevance',
                });

                // Filter out duplicate videos
                newItems = results.items.filter((item) => !processedVideoIds.has(item.id));
                newItems.forEach((item) => processedVideoIds.add(item.id));
            }

            const verifiedByVideoId = await getSearchVerifiedMap({
                client: youtubeiClient,
                query: continuation ? undefined : query,
                continuation,
            });

            if (results?.continuation) {
                await storeContinuation(
                    prefix,
                    results.continuation,
                    activeSearchInstances,
                    results,
                    redisClient,
                );
            }

            const embeddableVideos = await Promise.all(
                newItems.map(async (item) => {
                    const channels = await resolveVideoChannels(
                        item,
                        redisClient,
                        youtubeiClient,
                    );
                    const isVerified = verifiedByVideoId.get(item.id);
                    const resolvedChannels =
                        typeof isVerified === 'boolean'
                            ? channels.map((channel, index) =>
                                  index === 0
                                      ? { ...channel, verified: channel.verified || isVerified }
                                      : channel,
                              )
                            : channels;
                    await Promise.all(
                        resolvedChannels
                            .filter((channel) => Boolean(channel.id))
                            .map((channel) =>
                                setCachedChannel(redisClient, {
                                    id: channel.id!,
                                    name: channel.name,
                                    verified: channel.verified,
                                }),
                            ),
                    );
                    const video = mapYoutubeiVideo(item, {
                        channels: resolvedChannels.map(({ name, verified }) => ({ name, verified })),
                    });
                    const isEmbeddable = await checkEmbeddable(video.id);
                    return isEmbeddable ? video : null;
                }),
            ).then((videos) =>
                videos.filter((video): video is NonNullable<typeof video> => video !== null),
            );

            // Log current cache size
            logger.debug(`Current search instances cache size: ${activeSearchInstances.size}`);

            return {
                items: embeddableVideos,
                continuation: results?.continuation,
            };
        },
        {
            body: t.Object({
                query: t.String(),
                continuation: t.Optional(t.String()),
            }),
        },
    )
    .post(
        '/suggestions',
        async ({ body: { query } }): Promise<string[]> => {
            try {
                const suggestions = await youtube.getSuggestions(query);
                return suggestions;
            } catch (error) {
                logger.error('Failed to get suggestions', { error });
                return [];
            }
        },
        {
            body: t.Object({
                query: t.String(),
            }),
        },
    )
    .post(
        '/playlist',
        async ({ body: { playlistUrlOrId } }): Promise<YouTubeVideo[]> => {
            if (!playlistUrlOrId.startsWith('http') && !playlistUrlOrId.includes('youtube.com')) {
                playlistUrlOrId = `https://www.youtube.com/playlist?list=${playlistUrlOrId}&playnext=1`;
            }

            const url = new URL(playlistUrlOrId);
            url.searchParams.set('playnext', '1');

            const results = await youtube.getPlaylist(url.toString(), { fetchAll: true });
            return results.videos.map(cleanUpVideoField);
        },
        {
            body: t.Object({
                playlistUrlOrId: t.String(),
            }),
        },
    )
    .post(
        '/related',
        async ({
            body: { videoId, continuation },
            store: {
                youtubeiClient,
                redisClient,
                relatedInstances: stateRelatedInstances,
                redisKeyPrefixes,
            },
        }): Promise<{
            items: YouTubeVideo[];
            continuation?: string | null;
        }> => {
            try {
                let results: VideoRelated | undefined;
                let newItems: VideoCompact[] = [];
                const processedVideoIds = new Set<string>();
                const prefix = redisKeyPrefixes.RELATED;
                const activeRelatedInstances = stateRelatedInstances || relatedInstances;

                if (
                    continuation &&
                    (activeRelatedInstances.has(continuation) ||
                        (await redisClient.exists(getRedisKey(prefix, continuation))))
                ) {
                    logger.info(`Continuing related videos for: "${videoId}"`);
                    if (!activeRelatedInstances.has(continuation)) {
                        const timestamp = parseInt(
                            (await redisClient.get(getRedisKey(prefix, continuation))) || '0',
                        );
                        if (timestamp) {
                            const video = await youtubeiClient.getVideo(videoId);
                            if (video && video.related) {
                                results = video.related;
                                results.continuation = video?.related?.continuation || continuation;
                                activeRelatedInstances.set(continuation, {
                                    instance: results as unknown as SearchResult<'video'>,
                                    timestamp: timestamp,
                                });
                            }
                        }
                    } else {
                        const stored = activeRelatedInstances.get(continuation)!;
                        results = stored.instance as unknown as VideoRelated;
                    }

                    if (results) {
                        const currentLength = results.items.length;
                        await results.next();
                        const allNewItems = results.items
                            .slice(currentLength)
                            .filter((item): item is VideoCompact => 'duration' in item);

                        // Filter out duplicate videos
                        newItems = allNewItems.filter((item) => !processedVideoIds.has(item.id));
                        newItems.forEach((item) => processedVideoIds.add(item.id));

                        if (results.continuation) {
                            activeRelatedInstances.delete(continuation);
                            await storeContinuation(
                                prefix,
                                results.continuation,
                                activeRelatedInstances,
                                results,
                                redisClient,
                            );
                            await redisClient.del(getRedisKey(prefix, continuation));
                        }
                    }
                }

                if (!results) {
                    logger.info(`Getting related videos for: "${videoId}"`);
                    const video = await youtubeiClient.getVideo(videoId);
                    if (video && video.related) {
                        results = video.related;

                        // Filter out duplicate videos and ensure we only have video items
                        newItems = results.items
                            .filter((item): item is VideoCompact => 'duration' in item)
                            .filter((item) => !processedVideoIds.has(item.id));

                        newItems.forEach((item) => processedVideoIds.add(item.id));
                    }
                }

                if (results?.continuation) {
                    await storeContinuation(
                        prefix,
                        results.continuation,
                        activeRelatedInstances,
                        results,
                        redisClient,
                    );
                }

                const relatedVerifiedByVideoId = await getRelatedVerifiedMap({
                    client: youtubeiClient,
                    videoId: continuation ? undefined : videoId,
                    continuation,
                });

                const embeddableVideos = await Promise.all(
                    newItems.map(async (item) => {
                        const channels = await resolveVideoChannels(
                        item,
                        redisClient,
                        youtubeiClient,
                    );
                        const isVerified = relatedVerifiedByVideoId.get(item.id);
                        const resolvedChannels =
                            typeof isVerified === 'boolean'
                                ? channels.map((channel, index) =>
                                      index === 0
                                          ? { ...channel, verified: channel.verified || isVerified }
                                          : channel,
                                  )
                                : channels;
                        await Promise.all(
                            resolvedChannels
                                .filter((channel) => Boolean(channel.id))
                                .map((channel) =>
                                    setCachedChannel(redisClient, {
                                        id: channel.id!,
                                        name: channel.name,
                                        verified: channel.verified,
                                    }),
                                ),
                        );
                        const video = mapYoutubeiVideo(item, {
                            channels: resolvedChannels.map(({ name, verified }) => ({
                                name,
                                verified,
                            })),
                        });
                        const isEmbeddable = await checkEmbeddable(video.id);
                        return isEmbeddable ? video : null;
                    }),
                ).then((videos) =>
                    videos.filter((video): video is NonNullable<typeof video> => video !== null),
                );

                // Log current cache size
                logger.debug(
                    `Current related instances cache size: ${activeRelatedInstances.size}`,
                );

                return {
                    items: embeddableVideos,
                    continuation: results?.continuation,
                };
            } catch (error) {
                logger.error('Failed to get related videos', { error });
                return { items: [], continuation: null };
            }
        },
        {
            body: t.Object({
                videoId: t.String(),
                continuation: t.Optional(t.String()),
            }),
        },
    )
    .post(
        '/check-embeddable',
        async ({ body: { videoIds } }): Promise<{ videoId: string; canEmbed: boolean }[]> => {
            const results = await Promise.all(
                videoIds.map(async (videoId) => ({
                    videoId,
                    canEmbed: await checkEmbeddable(videoId),
                })),
            );

            return results;
        },
        {
            body: t.Object({
                videoIds: t.Array(t.String()),
            }),
        },
    );

export { checkEmbeddable } from './modules/youtube/embeddable';
export type SearchYoutubeiApp = typeof searchYoutubeiElysia;
