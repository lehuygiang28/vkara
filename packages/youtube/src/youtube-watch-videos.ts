import { isValidYoutubeVideoId } from './youtube-id';

export const WATCH_VIDEOS_ID_LIMIT = 50;

const WATCH_VIDEOS_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
]);

export function isWatchVideosHost(hostname: string): boolean {
    return WATCH_VIDEOS_HOSTS.has(hostname.toLowerCase());
}

export type WatchVideosParse =
    | { kind: 'absent' }
    | { kind: 'invalid' }
    | { kind: 'ok'; videoIds: string[] };

export function parseWatchVideosUrl(raw: string): WatchVideosParse {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('http')) {
        return { kind: 'absent' };
    }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return { kind: 'absent' };
    }

    if (!isWatchVideosHost(url.hostname)) {
        return { kind: 'absent' };
    }

    if (url.pathname.replace(/\/+$/, '') !== '/watch_videos') {
        return { kind: 'absent' };
    }

    const rawIds = url.searchParams.get('video_ids');
    if (rawIds === null) {
        return { kind: 'invalid' };
    }

    const tokens = rawIds.split(',');
    if (tokens.length === 0 || tokens.some((token) => !isValidYoutubeVideoId(token))) {
        return { kind: 'invalid' };
    }

    return { kind: 'ok', videoIds: tokens.slice(0, WATCH_VIDEOS_ID_LIMIT) };
}
