import type Redis from 'ioredis';
import type { YouTubeVideo } from '@vkara/youtube';
import { isTikTokVideo } from '@vkara/tiktok';

import { checkEmbeddable } from './resolve-embed-playability';

const MAX_EMBED_SKIP = 25;

export type ResolveEmbeddableQueueResult = {
    video: YouTubeVideo | null;
    remainingQueue: YouTubeVideo[];
    skippedCount: number;
};

/** Pops queue head until an embeddable video is found or the queue is exhausted. */
export async function resolveNextEmbeddableFromQueue(
    redisClient: Redis,
    queue: YouTubeVideo[],
): Promise<ResolveEmbeddableQueueResult> {
    const remainingQueue = [...queue];
    let skippedCount = 0;

    while (remainingQueue.length > 0 && skippedCount < MAX_EMBED_SKIP) {
        const candidate = remainingQueue.shift()!;
        if (isTikTokVideo(candidate) || (await checkEmbeddable(redisClient, candidate.id))) {
            return { video: candidate, remainingQueue, skippedCount };
        }
        skippedCount += 1;
    }

    return { video: null, remainingQueue, skippedCount };
}
