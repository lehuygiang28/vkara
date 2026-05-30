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
import { checkEmbeddable } from './modules/youtube/embeddable';
import {
    extractRendererMetadata,
    getRelatedRendererMetadata,
    getSearchRendererMetadata,
} from './modules/youtube/renderer-metadata';
import { loadVideoFromNextResponses } from './modules/youtube/load-video-from-next';
import { prepareYoutubeVideos } from './modules/youtube/prepare-youtube-videos';

const logger = createContextLogger('Search-Youtubei');
const youtubeiLogger = createContextLogger('Queue/Youtubei');

const youtubei = new Client({
    oauth: {
        enabled: false,
    },
});

const redisConnectionOptions = createRedisOptions(process.env);
const redis = new Redis(redisConnectionOptions);

const cleanupQueue = new Queue('search-instance-cleanup', { connection: redisConnectionOptions });

const worker = new Worker(
    'search-instance-cleanup',
    async () => {
        await cleanupOldInstances();
    },
    { connection: redisConnectionOptions },
);

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

const scheduleCleanupYoutubeiInstance = async () => {
    await cleanupQueue.add(
        'cleanup',
        {},
        {
            repeat: {
                pattern: '*/5 * * * *',
            },
        },
    );
    youtubeiLogger.info('Scheduled recurring cleanup job');
};

const collectUniqueNewItems = (
    items: VideoCompact[],
    processedVideoIds: Set<string>,
): VideoCompact[] => {
    const uniqueItems = items.filter((item) => !processedVideoIds.has(item.id));
    uniqueItems.forEach((item) => processedVideoIds.add(item.id));
    return uniqueItems;
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
                    newItems = collectUniqueNewItems(
                        results.items.slice(currentLength),
                        processedVideoIds,
                    );

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
                newItems = collectUniqueNewItems(results.items, processedVideoIds);
            }

            const searchMetadata = await getSearchRendererMetadata({
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

            const items = await prepareYoutubeVideos(
                youtubeiClient,
                redisClient,
                newItems,
                searchMetadata,
            );

            logger.debug(`Current search instances cache size: ${activeSearchInstances.size}`);

            return {
                items,
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
                let relatedMetadata = extractRendererMetadata(undefined);
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
                        newItems = collectUniqueNewItems(
                            results.items.slice(currentLength) as VideoCompact[],
                            processedVideoIds,
                        );

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
                    const { video, nextResponseData } = await loadVideoFromNextResponses(
                        youtubeiClient,
                        videoId,
                    );
                    relatedMetadata = extractRendererMetadata(nextResponseData);

                    if (video?.related) {
                        results = video.related;
                        newItems = collectUniqueNewItems(
                            results.items as VideoCompact[],
                            processedVideoIds,
                        );
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

                if (relatedMetadata.viewCountByVideoId.size === 0) {
                    relatedMetadata = await getRelatedRendererMetadata({
                        client: youtubeiClient,
                        videoId: continuation ? undefined : videoId,
                        continuation,
                    });
                }

                const items = await prepareYoutubeVideos(
                    youtubeiClient,
                    redisClient,
                    newItems,
                    relatedMetadata,
                );

                logger.debug(
                    `Current related instances cache size: ${activeRelatedInstances.size}`,
                );

                return {
                    items,
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
