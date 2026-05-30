import { Elysia, t } from 'elysia';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { type VideoCompact, type SearchResult } from 'youtubei';
import { fetchSearchSuggestions } from './modules/youtube/fetch-search-suggestions';
import { createRedisOptions } from '@vkara/shared-infra';

import { createContextLogger } from '@/utils/logger';
import type { YouTubeVideo } from '@vkara/shared-types';
import {
    cleanupOldInstances,
    getRedisKey,
    REDIS_KEY_PREFIXES,
    relatedInstances,
    searchInstances,
    storeContinuation,
} from './modules/youtube/cache';
import { checkEmbeddableMany } from './modules/youtube/embeddable';
import { extractRendererMetadata } from './modules/youtube/renderer-metadata';
import {
    createRelatedContinuationCache,
    fetchRelatedContinuationPage,
} from './modules/youtube/fetch-related-page';
import {
    fetchSearchContinuationPage,
    fetchSearchInitialPage,
} from './modules/youtube/fetch-search-page';
import { loadVideoFromNextResponses } from './modules/youtube/load-video-from-next';
import { prepareYoutubeVideos } from './modules/youtube/prepare-youtube-videos';
import { fetchYoutubePlaylistVideos } from './modules/youtube/fetch-playlist-videos';
import { getYoutubeiClient } from './modules/youtube/youtubei-client';

const logger = createContextLogger('Search-Youtubei');
const youtubeiLogger = createContextLogger('Queue/Youtubei');

const youtubei = getYoutubeiClient();

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
            try {
                let results: SearchResult<'video'> | undefined;
                let newItems: VideoCompact[] = [];
                let searchMetadata = extractRendererMetadata(undefined);
                const processedVideoIds = new Set<string>();
                const prefix = redisKeyPrefixes.SEARCH;
                const activeSearchInstances = stateSearchInstances || searchInstances;

                if (continuation) {
                    logger.info(`Continuing search: "${query}"`);
                    const cachedResult = activeSearchInstances.get(continuation)?.instance;

                    const page = await fetchSearchContinuationPage(
                        youtubeiClient,
                        continuation,
                        cachedResult,
                    );

                    newItems = collectUniqueNewItems(page.items, processedVideoIds);
                    searchMetadata = page.metadata;
                    results = page.searchResult;

                    activeSearchInstances.delete(continuation);
                    await redisClient.del(getRedisKey(prefix, continuation));
                } else {
                    logger.info(`New search: "${query}"`);
                    const page = await fetchSearchInitialPage(youtubeiClient, query);
                    newItems = collectUniqueNewItems(page.items, processedVideoIds);
                    searchMetadata = page.metadata;
                    results = page.searchResult;
                }

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
            } catch (error) {
                logger.error('Failed to search YouTube', { error, query, continuation });
                return { items: [], continuation: null };
            }
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
        async ({ body: { query } }): Promise<string[]> => fetchSearchSuggestions(query),
        {
            body: t.Object({
                query: t.String(),
            }),
        },
    )
    .post(
        '/playlist',
        async ({ body: { playlistUrlOrId } }): Promise<YouTubeVideo[]> => {
            return fetchYoutubePlaylistVideos(playlistUrlOrId, { fetchAll: true });
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
                let results: SearchResult<'video'> | undefined;
                let newItems: VideoCompact[] = [];
                let relatedMetadata = extractRendererMetadata(undefined);
                const processedVideoIds = new Set<string>();
                const prefix = redisKeyPrefixes.RELATED;
                const activeRelatedInstances = stateRelatedInstances || relatedInstances;

                if (continuation) {
                    logger.info(`Continuing related videos for: "${videoId}"`);
                    const cachedShell = activeRelatedInstances.get(continuation)?.instance;

                    const page = await fetchRelatedContinuationPage(youtubeiClient, continuation);
                    newItems = collectUniqueNewItems(page.items, processedVideoIds);
                    relatedMetadata = page.metadata;

                    const mergedItems = cachedShell
                        ? [...(cachedShell.items as VideoCompact[]), ...page.items]
                        : page.items;

                    results = createRelatedContinuationCache(
                        youtubeiClient,
                        mergedItems,
                        page.continuation,
                    );

                    activeRelatedInstances.delete(continuation);
                    await redisClient.del(getRedisKey(prefix, continuation));
                } else {
                    logger.info(`Getting related videos for: "${videoId}"`);
                    const { video, nextResponseData } = await loadVideoFromNextResponses(
                        youtubeiClient,
                        videoId,
                    );
                    relatedMetadata = extractRendererMetadata(nextResponseData);

                    if (video?.related) {
                        newItems = collectUniqueNewItems(
                            video.related.items as VideoCompact[],
                            processedVideoIds,
                        );
                        results = createRelatedContinuationCache(
                            youtubeiClient,
                            video.related.items as VideoCompact[],
                            video.related.continuation,
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
        async ({ body: { videoIds } }): Promise<{ videoId: string; canEmbed: boolean }[]> =>
            checkEmbeddableMany(videoIds),
        {
            body: t.Object({
                videoIds: t.Array(t.String()),
            }),
        },
    );
