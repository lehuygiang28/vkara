import type { Client, VideoCompact } from 'youtubei';

import { resolveViewCount, resolveYoutubeLiveFlag } from '@vkara/youtube';

import { fetchLiveViewerCount } from './live-viewers';
import type { RendererMetadataMaps } from './renderer-metadata';

export async function resolveItemViews(
    client: Client,
    item: VideoCompact,
    metadata: Pick<RendererMetadataMaps, 'viewCountByVideoId'>,
    liveViewerCounts?: Map<string, number>,
): Promise<number> {
    const preloaded = liveViewerCounts?.get(item.id);
    if (preloaded !== undefined && preloaded > 0) {
        return preloaded;
    }

    let views = metadata.viewCountByVideoId.get(item.id) ?? resolveViewCount(item.viewCount);

    if (
        views === 0 &&
        resolveYoutubeLiveFlag({
            isLive: item.isLive,
            duration: item.duration,
            uploadDate: item.uploadDate,
        })
    ) {
        views = (await fetchLiveViewerCount(client, item.id)) ?? 0;
    }

    return views;
}
