import type { YouTubeVideo } from '@vkara/shared-types';

import { checkEmbeddable, checkEmbeddableMany } from './embeddable';

const MAX_EMBED_SKIP = 25;

export type ResolveEmbeddableQueueResult = {
    video: YouTubeVideo | null;
    remainingQueue: YouTubeVideo[];
    skippedCount: number;
};

/** Pops queue head until an embeddable video is found or the queue is exhausted. */
export async function resolveNextEmbeddableFromQueue(
    queue: YouTubeVideo[],
): Promise<ResolveEmbeddableQueueResult> {
    const remainingQueue = [...queue];
    let skippedCount = 0;

    while (remainingQueue.length > 0 && skippedCount < MAX_EMBED_SKIP) {
        const candidate = remainingQueue.shift()!;
        if (await checkEmbeddable(candidate.id)) {
            return { video: candidate, remainingQueue, skippedCount };
        }
        skippedCount += 1;
    }

    return { video: null, remainingQueue, skippedCount };
}

export async function filterEmbeddableVideos(videos: YouTubeVideo[]): Promise<YouTubeVideo[]> {
    if (videos.length === 0) return [];

    const results = await checkEmbeddableMany(videos.map((video) => video.id));
    const embeddableIds = new Set(
        results.filter((entry) => entry.canEmbed).map((entry) => entry.videoId),
    );

    return videos.filter((video) => embeddableIds.has(video.id));
}
