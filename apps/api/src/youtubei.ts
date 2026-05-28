import { Elysia, t } from 'elysia';
import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { Client, type VideoCompact, type SearchResult, type VideoRelated } from 'youtubei';
import youtube from 'youtube-sr';

import { createContextLogger } from '@/utils/logger';
import type { YouTubeVideo } from './types';
import { cleanUpVideoField, formatSeconds } from './utils/common';

const logger = createContextLogger('Search-Youtubei');
const youtubeiLogger = createContextLogger('Queue/Youtubei');

// const response = await OAuth.authorize();
const youtubei = new Client({
    oauth: {
        enabled: false,
        // refreshToken: response.refreshToken,
    },
});

// Redis connection
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});

// Define key prefixes to distinguish between different types of cached data
const REDIS_KEY_PREFIXES = {
    SEARCH: 'search-instance:',
    RELATED: 'related-instance:',
};

// Cleanup time in milliseconds (5 minutes)
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

// Maximum number of instances to cache per type
const MAX_INSTANCES_PER_TYPE = 1000;

// Create the cleanup queue
const cleanupQueue = new Queue('search-instance-cleanup', { connection: redis });

interface SearchInstanceWithTimestamp {
    instance: SearchResult<'video'>;
    timestamp: number;
}

// Store SearchResult instances in memory
const searchInstances = new Map<string, SearchInstanceWithTimestamp>();
const relatedInstances = new Map<string, SearchInstanceWithTimestamp>();

// Helper function to get full Redis key from a continuation token and prefix
const getRedisKey = (prefix: string, continuation: string): string => `${prefix}${continuation}`;

// Helper function to store continuation token with automatic expiration
const storeContinuation = async (
    prefix: string,
    continuation: string,
    instancesMap: Map<string, SearchInstanceWithTimestamp>,
    instance: SearchResult<'video'> | VideoRelated,
    redisClient: Redis,
): Promise<void> => {
    // Store in memory
    instancesMap.set(continuation, {
        instance: instance as SearchResult<'video'>,
        timestamp: Date.now(),
    });

    // Store in Redis with automatic expiration
    await redisClient.set(
        getRedisKey(prefix, continuation),
        Date.now().toString(),
        'EX',
        Math.floor(CLEANUP_TIMEOUT / 1000), // Convert ms to seconds for Redis TTL
    );

    // Check if we need to clean up oldest entries when reaching the limit
    if (instancesMap.size > MAX_INSTANCES_PER_TYPE) {
        // Sort by timestamp and remove oldest entries
        const entries = Array.from(instancesMap.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove 10% of the oldest entries
        const entriesToRemove = Math.ceil(MAX_INSTANCES_PER_TYPE * 0.1);
        const keysToRemove = entries.slice(0, entriesToRemove).map((entry) => entry[0]);

        for (const key of keysToRemove) {
            instancesMap.delete(key);
            await redisClient.del(getRedisKey(prefix, key));
        }

        const logPrefix = prefix === REDIS_KEY_PREFIXES.SEARCH ? 'Search' : 'Related';
        youtubeiLogger.info(
            `${logPrefix} cache limit reached. Removed ${keysToRemove.length} oldest entries.`,
        );
    }
};

// Cleanup function to remove old instances - now only for backup since we use Redis TTL
const cleanupOldInstances = async () => {
    const now = Date.now();
    let cleanedSearch = 0;
    let cleanedRelated = 0;

    // Clean up search instances
    for (const [key, value] of searchInstances.entries()) {
        if (now - value.timestamp > CLEANUP_TIMEOUT) {
            searchInstances.delete(key);
            cleanedSearch++;
        }
    }

    // Clean up related instances
    for (const [key, value] of relatedInstances.entries()) {
        if (now - value.timestamp > CLEANUP_TIMEOUT) {
            relatedInstances.delete(key);
            cleanedRelated++;
        }
    }

    if (cleanedSearch > 0 || cleanedRelated > 0) {
        youtubeiLogger.info(
            `Memory cleanup: ${cleanedSearch} search instances, ${cleanedRelated} related instances`,
        );
    }

    // Log current cache size
    youtubeiLogger.debug(
        `Current cache size: ${searchInstances.size} search, ${relatedInstances.size} related`,
    );
};

// Create a worker to process cleanup jobs
const worker = new Worker(
    'search-instance-cleanup',
    async () => {
        await cleanupOldInstances();
    },
    { connection: redis },
);

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
            store: { youtubeiClient, redisClient, searchInstances, redisKeyPrefixes },
        }): Promise<{
            items: YouTubeVideo[];
            continuation?: string | null;
        }> => {
            let results: SearchResult<'video'> | undefined;
            let newItems: VideoCompact[] = [];
            const processedVideoIds = new Set<string>();
            const prefix = redisKeyPrefixes.SEARCH;

            if (
                continuation &&
                (searchInstances.has(continuation) ||
                    (await redisClient.exists(getRedisKey(prefix, continuation))))
            ) {
                logger.info(`Continuing search: "${query}"`);
                if (!searchInstances.has(continuation)) {
                    const timestamp = parseInt(
                        (await redisClient.get(getRedisKey(prefix, continuation))) || '0',
                    );
                    if (timestamp) {
                        results = await youtubeiClient.search(query, {
                            type: 'video',
                            sortBy: 'relevance',
                        });
                        results.continuation = continuation;
                        searchInstances.set(continuation, {
                            instance: results,
                            timestamp: timestamp,
                        });
                    }
                } else {
                    const stored = searchInstances.get(continuation)!;
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
                        searchInstances.delete(continuation);
                        await storeContinuation(
                            prefix,
                            results.continuation,
                            searchInstances,
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

            if (results?.continuation) {
                await storeContinuation(
                    prefix,
                    results.continuation,
                    searchInstances,
                    results,
                    redisClient,
                );
            }

            const embeddableVideos = await Promise.all(
                newItems.map(async (item) => {
                    const video = mapYoutubeiVideo(item);
                    const isEmbeddable = await checkEmbeddable(video.id);
                    return isEmbeddable ? video : null;
                }),
            ).then((videos) =>
                videos.filter((video): video is NonNullable<typeof video> => video !== null),
            );

            // Log current cache size
            logger.debug(`Current search instances cache size: ${searchInstances.size}`);

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
            store: { youtubeiClient, redisClient, relatedInstances, redisKeyPrefixes },
        }): Promise<{
            items: YouTubeVideo[];
            continuation?: string | null;
        }> => {
            try {
                let results: VideoRelated | undefined;
                let newItems: VideoCompact[] = [];
                const processedVideoIds = new Set<string>();
                const prefix = redisKeyPrefixes.RELATED;

                if (
                    continuation &&
                    (relatedInstances.has(continuation) ||
                        (await redisClient.exists(getRedisKey(prefix, continuation))))
                ) {
                    logger.info(`Continuing related videos for: "${videoId}"`);
                    if (!relatedInstances.has(continuation)) {
                        const timestamp = parseInt(
                            (await redisClient.get(getRedisKey(prefix, continuation))) || '0',
                        );
                        if (timestamp) {
                            const video = await youtubeiClient.getVideo(videoId);
                            if (video && video.related) {
                                results = video.related;
                                results.continuation = video?.related?.continuation || continuation;
                                relatedInstances.set(continuation, {
                                    instance: results as unknown as SearchResult<'video'>,
                                    timestamp: timestamp,
                                });
                            }
                        }
                    } else {
                        const stored = relatedInstances.get(continuation)!;
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
                            relatedInstances.delete(continuation);
                            await storeContinuation(
                                prefix,
                                results.continuation,
                                relatedInstances,
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
                        relatedInstances,
                        results,
                        redisClient,
                    );
                }

                const embeddableVideos = await Promise.all(
                    newItems.map(async (item) => {
                        const video = mapYoutubeiVideo(item);
                        const isEmbeddable = await checkEmbeddable(video.id);
                        return isEmbeddable ? video : null;
                    }),
                ).then((videos) =>
                    videos.filter((video): video is NonNullable<typeof video> => video !== null),
                );

                // Log current cache size
                logger.debug(`Current related instances cache size: ${relatedInstances.size}`);

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

const mapYoutubeiVideo = (video: VideoCompact): YouTubeVideo => ({
    id: video.id,
    duration: video.duration || 0,
    duration_formatted: formatSeconds(video.duration),
    thumbnail: {
        url: video.thumbnails[0].url,
    },
    title: video.title,
    type: 'video',
    url: '',
    uploadedAt: video.uploadDate || '',
    views: video.viewCount || 0,
    channel: {
        name: video.channel?.name || 'N/A',
        verified: false,
    },
});

export const checkEmbeddable = async (videoId: string): Promise<boolean> => {
    const baseUrls = [`https://www.youtube-nocookie.com/embed/`, `https://www.youtube.com/embed/`];
    const errString = `Playback on other websites has been disabled by the video own`;
    const stringAbility = `previewPlayabilityStatus`;

    const url = `${baseUrls[Math.floor(Math.random() * baseUrls.length)]}${videoId}`;
    const raw = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'accept-language': 'en-US,en;q=0.9',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        },
    });

    if (!raw.ok) {
        return false;
    }

    const text = await raw.text();
    return !text.includes(errString) && text.includes(stringAbility);
};

export type SearchYoutubeiApp = typeof searchYoutubeiElysia;
