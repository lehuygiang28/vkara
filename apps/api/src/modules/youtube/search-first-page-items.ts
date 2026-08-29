import type { YouTubeVideo } from '@vkara/youtube';

import { fetchSearchInitialPage } from '@/modules/youtube/fetch-search-page';
import { prepareYoutubeVideos } from '@/modules/youtube/prepare-youtube-videos';
import { getYoutubeiClient } from '@/modules/youtube/youtubei-client';
import { redis } from '@/redis';

/** One InnerTube search page → playable videos. Used by HTTP agent hydrate. */
export async function searchFirstPageItems(query: string): Promise<YouTubeVideo[]> {
    const client = getYoutubeiClient();
    const page = await fetchSearchInitialPage(client, query);
    return prepareYoutubeVideos(client, redis, page.items, page.metadata);
}
