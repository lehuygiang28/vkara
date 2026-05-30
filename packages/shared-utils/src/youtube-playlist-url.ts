import { isValidYoutubeVideoId } from './youtube-id';

const PLAYLIST_ID_PATTERN = /(PL|FL|UU|LL|RD|OL)[a-zA-Z0-9-_]{11,41}/;
const ALBUM_PATTERN = /(RDC|O)LAK5uy_[a-zA-Z0-9-_]{33}/;

export type YoutubePlaylistInput = {
    /** URL passed to youtubei playlist fetcher */
    fetchUrl: string;
    isMix: boolean;
    listId: string;
    seedVideoId?: string;
};

function extractListId(raw: string): string | null {
    const album = raw.match(ALBUM_PATTERN)?.[0];
    if (album) return album;
    return raw.match(PLAYLIST_ID_PATTERN)?.[0] ?? null;
}

function isMixListId(listId: string): boolean {
    return listId.startsWith('RD') && !ALBUM_PATTERN.test(listId);
}

/** RDMM{videoId} and similar mix IDs embed the seed watch video. */
export function extractSeedVideoIdFromMixListId(listId: string): string | null {
    if (listId.startsWith('RDMM') && listId.length >= 15) {
        const candidate = listId.slice(4);
        if (isValidYoutubeVideoId(candidate)) return candidate;
    }

    if (listId.startsWith('RD') && listId.length >= 13) {
        const tail = listId.slice(-11);
        if (isValidYoutubeVideoId(tail)) return tail;
    }

    return null;
}

function buildMixWatchUrl(listId: string, videoId?: string | null): string {
    const seed = videoId ?? extractSeedVideoIdFromMixListId(listId);
    if (seed) {
        return `https://www.youtube.com/watch?v=${seed}&list=${listId}`;
    }
    return `https://www.youtube.com/watch?v=&list=${listId}`;
}

function buildStandardPlaylistUrl(listId: string): string {
    const url = new URL('https://www.youtube.com/playlist');
    url.searchParams.set('list', listId);
    url.searchParams.set('playnext', '1');
    return url.toString();
}

/**
 * Normalizes a YouTube playlist URL or bare list ID for fetching.
 * Mix/radio lists (RD*) must stay on watch URLs — playlist URLs and playnext break InnerTube mix fetch.
 */
export function parseYoutubePlaylistInput(raw: string): YoutubePlaylistInput {
    const trimmed = raw.trim();
    if (!trimmed) {
        throw new Error('Playlist URL or ID is required');
    }

    if (!trimmed.startsWith('http') && !trimmed.includes('youtube.com')) {
        const listId = extractListId(trimmed);
        if (!listId) {
            throw new Error('Invalid playlist ID');
        }

        const isMix = isMixListId(listId);
        return {
            fetchUrl: isMix ? buildMixWatchUrl(listId) : buildStandardPlaylistUrl(listId),
            isMix,
            listId,
            seedVideoId: isMix ? extractSeedVideoIdFromMixListId(listId) ?? undefined : undefined,
        };
    }

    const url = new URL(trimmed);
    const listId = url.searchParams.get('list') ?? extractListId(trimmed);
    if (!listId) {
        throw new Error('Invalid playlist URL');
    }

    const isMix = isMixListId(listId);
    if (isMix) {
        const seedVideoId = url.searchParams.get('v') ?? extractSeedVideoIdFromMixListId(listId);
        return {
            fetchUrl: buildMixWatchUrl(listId, seedVideoId),
            isMix: true,
            listId,
            seedVideoId: seedVideoId ?? undefined,
        };
    }

    return {
        fetchUrl: buildStandardPlaylistUrl(listId),
        isMix: false,
        listId,
    };
}
