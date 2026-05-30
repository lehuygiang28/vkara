import type { YouTubeVideo } from '@vkara/shared-types';

/** Preserves queue items added while advance was resolving embeddability. */
export function mergeQueueAfterAdvance(
    snapshotQueue: YouTubeVideo[],
    remainingQueue: YouTubeVideo[],
    currentQueue: YouTubeVideo[],
): YouTubeVideo[] {
    const snapshotIds = new Set(snapshotQueue.map((video) => video.id));
    const concurrentAdds = currentQueue.filter((video) => !snapshotIds.has(video.id));
    return [...remainingQueue, ...concurrentAdds];
}
