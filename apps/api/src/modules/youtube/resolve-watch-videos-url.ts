import { isWatchVideosHost, parseWatchVideosUrl } from '@vkara/youtube';

import { youtubeOutboundFetch } from './youtube-outbound-fetch';

const REDIRECT_LIMIT = 4;

const WATCH_VIDEOS_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
};

export type WatchVideosFetch = (
    url: string,
    init: { method: string; redirect: 'manual'; headers: Record<string, string> },
) => Promise<Response>;

export async function resolveWatchVideosPlaylistUrl(
    videoIds: string[],
    fetchImpl: WatchVideosFetch = youtubeOutboundFetch,
): Promise<string> {
    const start = new URL('https://www.youtube.com/watch_videos');
    start.searchParams.set('video_ids', videoIds.join(','));
    let current = start.toString();

    for (let hop = 0; hop < REDIRECT_LIMIT; hop++) {
        const response = await fetchImpl(current, {
            method: 'GET',
            redirect: 'manual',
            headers: WATCH_VIDEOS_HEADERS,
        });
        const location = response.headers.get('location');
        if (!location || response.status < 300 || response.status >= 400) {
            break;
        }

        let next: URL;
        try {
            next = new URL(location, current);
        } catch {
            throw new Error('Invalid playlist URL');
        }
        if (!isWatchVideosHost(next.hostname)) {
            throw new Error('Invalid playlist URL');
        }
        if (next.searchParams.get('list')) {
            return next.toString();
        }
        current = next.toString();
    }

    throw new Error('Invalid playlist URL');
}

export async function coercePlaylistFetchInput(
    raw: string,
    fetchImpl?: WatchVideosFetch,
): Promise<string> {
    const parsed = parseWatchVideosUrl(raw);
    if (parsed.kind === 'invalid') {
        throw new Error('Invalid playlist URL');
    }
    if (parsed.kind === 'absent') {
        return raw;
    }
    return resolveWatchVideosPlaylistUrl(parsed.videoIds, fetchImpl);
}
