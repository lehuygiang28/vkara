import youtubeSr, { Util, Video } from 'youtube-sr';
import { parseYoutubePlaylistInput } from '@vkara/shared-utils';

import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('FetchPlaylist');

type MixPanelRenderer = {
    videoId?: string;
    title?: { simpleText?: string; runs?: { text?: string }[] };
    lengthText?: { simpleText?: string };
    thumbnail?: { thumbnails?: { url?: string; height?: number; width?: number }[] };
    shortBylineText?: {
        runs?: {
            text?: string;
            navigationEndpoint?: {
                browseEndpoint?: { browseId?: string; canonicalBaseUrl?: string };
            };
        }[];
    };
};

function mixChannelFromRenderer(renderer: MixPanelRenderer) {
    const runs = renderer.shortBylineText?.runs ?? [];
    const name = runs.map((run) => run.text ?? '').join('').trim() || 'Unknown';
    const browse = runs.find((run) => run.navigationEndpoint?.browseEndpoint)?.navigationEndpoint
        ?.browseEndpoint;

    return {
        name,
        id: browse?.browseId,
        url: browse?.canonicalBaseUrl
            ? `https://www.youtube.com${browse.canonicalBaseUrl}`
            : undefined,
        icon: null as null,
    };
}

function parseMixVideo(renderer: MixPanelRenderer): Video | null {
    if (!renderer.videoId) return null;

    const title =
        renderer.title?.simpleText ??
        renderer.title?.runs?.map((run) => run.text ?? '').join('') ??
        'Untitled';

    const thumbs = renderer.thumbnail?.thumbnails ?? [];
    const thumb = thumbs[thumbs.length - 1];

    return new Video({
        id: renderer.videoId,
        title,
        thumbnail: thumb?.url
            ? {
                  id: renderer.videoId,
                  url: thumb.url,
                  height: thumb.height ?? 0,
                  width: thumb.width ?? 0,
              }
            : undefined,
        duration: renderer.lengthText?.simpleText
            ? Util.parseDuration(renderer.lengthText.simpleText)
            : 0,
        duration_raw: renderer.lengthText?.simpleText ?? '0:00',
        channel: mixChannelFromRenderer(renderer),
    });
}

function parseMixPlaylistFromHtml(html: string, limit: number): Video[] {
    try {
        const chunk = html.split('var ytInitialData = ')[1]?.split(';</script>')[0];
        if (!chunk) return [];

        const parsed = JSON.parse(chunk) as {
            contents?: {
                twoColumnWatchNextResults?: {
                    playlist?: { playlist?: { contents?: { playlistPanelVideoRenderer?: MixPanelRenderer }[] } };
                };
            };
        };

        const contents =
            parsed.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents ?? [];

        const videos: Video[] = [];
        for (const entry of contents) {
            const video = parseMixVideo(entry.playlistPanelVideoRenderer ?? {});
            if (video) videos.push(video);
            if (videos.length >= limit) break;
        }

        return videos;
    } catch (error) {
        logger.warn('Failed to parse mix playlist HTML', { error });
        return [];
    }
}

async function fetchMixPlaylist(fetchUrl: string, limit: number): Promise<Video[]> {
    const html = await Util.getHTML(`${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}hl=en`);
    const videos = parseMixPlaylistFromHtml(html, limit);
    if (videos.length > 0) return videos;

    const parsed = parseYoutubePlaylistInput(fetchUrl);
    if (!parsed.seedVideoId) return [];

    const seed = await youtubeSr
        .getVideo(`https://www.youtube.com/watch?v=${parsed.seedVideoId}`)
        .catch(() => null);

    return seed ? [seed] : [];
}

export async function fetchYoutubePlaylistVideos(
    playlistUrlOrId: string,
    options?: { limit?: number; fetchAll?: boolean },
): Promise<Video[]> {
    const parsed = parseYoutubePlaylistInput(playlistUrlOrId);
    const limit = options?.limit ?? 200;
    const fetchAll = options?.fetchAll ?? true;

    if (parsed.isMix) {
        return fetchMixPlaylist(parsed.fetchUrl, limit);
    }

    try {
        const results = await youtubeSr.getPlaylist(parsed.fetchUrl, { fetchAll, limit });
        return results?.videos ?? [];
    } catch (error) {
        logger.error('Failed to fetch playlist', { error, fetchUrl: parsed.fetchUrl });
        throw error;
    }
}
