import type { VideoCompact } from 'youtubei';

import type { YouTubeVideo } from '@vkara/shared-types';
import { isValidYoutubeVideoId } from '@vkara/shared-utils';

type SearchResultCandidate = Pick<VideoCompact, 'id' | 'title'>;

export function isSearchResultVideo(item: SearchResultCandidate): boolean {
    if (!isValidYoutubeVideoId(item.id)) {
        return false;
    }

    const title = typeof item.title === 'string' ? item.title.trim() : '';
    return title.length > 0;
}

export function isPlayableYoutubeVideo(video: Pick<YouTubeVideo, 'id' | 'title'>): boolean {
    if (!isValidYoutubeVideoId(video.id)) {
        return false;
    }

    const title = typeof video.title === 'string' ? video.title.trim() : '';
    return title.length > 0;
}
