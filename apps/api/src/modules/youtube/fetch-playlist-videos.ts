import type { MixPlaylist, Playlist, VideoCompact } from 'youtubei';
import type { YouTubeVideo } from '@vkara/youtube';
import { parseYoutubePlaylistInput, type YoutubePlaylistInput } from '@vkara/youtube';

import { createContextLogger } from '@/utils/logger';
import { formatSeconds } from '@vkara/youtube';

import { postInnertube } from './innertube-post';
import { youtubeOutboundFetch } from './youtube-outbound-fetch';
import { getYoutubeiClient } from './youtubei-client';
import { asYoutubeRawData } from './youtubei-raw-data';
import { mapYoutubeiFullVideo, mapYoutubeiVideo, mapYoutubeiThumbnails } from './video-mapper';

const logger = createContextLogger('FetchPlaylist');

/**
 * TODO(phase-2): Enrich playlist rows with view counts and channel verified badges.
 * Search/related use `prepareYoutubeVideos` (renderer metadata + channel prefetch).
 * Playlist import maps `VideoCompact` directly, so views/verified are often 0/false
 * (mix/HTML paths hardcode them). Reuse or extend that pipeline only after research:
 * large playlists mean many Innertube/Redis calls and risk YouTube rate limits.
 */

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

type MixPlaylistContents = { playlistPanelVideoRenderer?: MixPanelRenderer }[] | undefined;

function parseHmsDuration(text: string): number {
    const parts = text.split(':').map((part) => Number.parseInt(part, 10));
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
    return parts[0] ?? 0;
}

function channelNameFromMixRenderer(renderer: MixPanelRenderer): string {
    const runs = renderer.shortBylineText?.runs ?? [];
    return (
        runs
            .map((run) => run.text ?? '')
            .join('')
            .trim() || 'Unknown'
    );
}

function parseMixRendererToYouTubeVideo(renderer: MixPanelRenderer): YouTubeVideo | null {
    if (!renderer.videoId) return null;

    const title =
        renderer.title?.simpleText ??
        renderer.title?.runs?.map((run) => run.text ?? '').join('') ??
        'Untitled';

    const durationText = renderer.lengthText?.simpleText ?? '0:00';
    const duration = durationText ? parseHmsDuration(durationText) : 0;
    const thumbs = renderer.thumbnail?.thumbnails ?? [];

    return {
        id: renderer.videoId,
        title,
        duration,
        duration_formatted: duration > 0 ? formatSeconds(duration) : durationText,
        type: 'video',
        url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: channelNameFromMixRenderer(renderer), verified: false }],
        thumbnails: mapYoutubeiThumbnails(
            renderer.videoId,
            thumbs as Parameters<typeof mapYoutubeiThumbnails>[1],
        ),
        isLive: false,
    };
}

function parseMixPlaylistContents(contents: MixPlaylistContents, limit: number): YouTubeVideo[] {
    const videos: YouTubeVideo[] = [];
    for (const entry of contents ?? []) {
        const video = parseMixRendererToYouTubeVideo(entry.playlistPanelVideoRenderer ?? {});
        if (video) videos.push(video);
        if (videos.length >= limit) break;
    }
    return videos;
}

function extractMixContentsFromInnertube(data: unknown): MixPlaylistContents {
    const parsed = asYoutubeRawData(data) as {
        contents?: {
            twoColumnWatchNextResults?: {
                playlist?: { playlist?: { contents?: MixPlaylistContents } };
            };
        };
    };

    return parsed.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents;
}

function buildSeedYouTubeVideo(videoId: string): YouTubeVideo {
    return {
        id: videoId,
        title: 'Untitled',
        duration: 0,
        duration_formatted: '0:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Unknown', verified: false }],
        thumbnails: mapYoutubeiThumbnails(videoId),
        isLive: false,
    };
}

/** Maps playlist compacts without `prepareYoutubeVideos` — see module TODO(phase-2). */
function mapCompactsToYouTubeVideos(compacts: VideoCompact[], limit: number): YouTubeVideo[] {
    return compacts.slice(0, limit).map((compact) => mapYoutubeiVideo(compact));
}

function parseMixPlaylistFromHtml(html: string, limit: number): YouTubeVideo[] {
    try {
        const chunk = html.split('var ytInitialData = ')[1]?.split(';</script>')[0];
        if (!chunk) return [];

        const parsed = JSON.parse(chunk) as {
            contents?: {
                twoColumnWatchNextResults?: {
                    playlist?: { playlist?: { contents?: MixPlaylistContents } };
                };
            };
        };

        return parseMixPlaylistContents(
            parsed.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents,
            limit,
        );
    } catch (error) {
        logger.warn('Failed to parse mix playlist HTML', { error });
        return [];
    }
}

async function loadPlaylistVideos(
    playlist: Playlist,
    options: { limit: number; fetchAll: boolean },
): Promise<VideoCompact[]> {
    const { limit, fetchAll } = options;

    if (fetchAll) {
        if (playlist.videos.continuation) {
            try {
                await playlist.videos.next(0);
            } catch (error) {
                logger.warn('Failed to load full playlist via youtubei pagination', {
                    error,
                    listId: playlist.id,
                });
            }
        }
        return playlist.videos.items.slice(0, limit);
    }

    while (playlist.videos.items.length < limit && playlist.videos.continuation) {
        try {
            await playlist.videos.next(1);
        } catch (error) {
            logger.warn('Failed to load next playlist page via youtubei', {
                error,
                listId: playlist.id,
            });
            break;
        }
    }

    return playlist.videos.items.slice(0, limit);
}

async function fetchStandardPlaylistViaInnertube(
    listId: string,
    options: { limit: number; fetchAll: boolean },
): Promise<YouTubeVideo[]> {
    const client = getYoutubeiClient();

    try {
        const playlist = await client.getPlaylist<Playlist>(listId);
        if (!playlist?.videos) {
            return [];
        }

        const compacts = await loadPlaylistVideos(playlist, options);
        return mapCompactsToYouTubeVideos(compacts, options.limit);
    } catch (error) {
        logger.error('Failed to fetch standard playlist via youtubei', { error, listId });
        throw error;
    }
}

async function fetchMixViaInnertube(listId: string, limit: number): Promise<YouTubeVideo[]> {
    const client = getYoutubeiClient();

    try {
        const mix = await client.getPlaylist<MixPlaylist>(listId);
        if (mix?.videos.length) {
            return mapCompactsToYouTubeVideos(mix.videos, limit);
        }
    } catch (error) {
        logger.warn('youtubei getPlaylist mix failed, trying raw next', { error, listId });
    }

    try {
        const response = await postInnertube(client, '/youtubei/v1/next', { playlistId: listId });
        const data = response.data as { error?: unknown };
        if (data.error) {
            return [];
        }

        return parseMixPlaylistContents(extractMixContentsFromInnertube(response.data), limit);
    } catch (error) {
        logger.warn('innertube next mix fetch failed', { error, listId });
        return [];
    }
}

async function fetchMixPageHtml(fetchUrl: string): Promise<string | null> {
    const url = `${fetchUrl}${fetchUrl.includes('?') ? '&' : '?'}hl=en`;

    try {
        const response = await youtubeOutboundFetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'accept-language': 'en-US,en;q=0.9',
                accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                Referer: 'https://www.youtube.com/',
            },
        });

        if (response.ok) {
            return await response.text();
        }

        logger.warn('HTML fetch for mix returned non-OK status', {
            fetchUrl,
            status: response.status,
        });
    } catch (error) {
        logger.warn('HTML fetch for mix failed', { error, fetchUrl });
    }

    return null;
}

async function fetchSeedYouTubeVideo(videoId: string): Promise<YouTubeVideo | null> {
    const client = getYoutubeiClient();

    try {
        const video = await client.getVideo(videoId);
        if (!video) return null;

        return mapYoutubeiFullVideo(video);
    } catch (error) {
        logger.warn('youtubei getVideo seed fallback failed', { error, videoId });
        return null;
    }
}

async function fetchMixPlaylist(
    parsed: YoutubePlaylistInput,
    options: { limit: number },
): Promise<YouTubeVideo[]> {
    const { limit } = options;

    const fromInnertube = await fetchMixViaInnertube(parsed.listId, limit);
    if (fromInnertube.length > 0) {
        return fromInnertube;
    }

    const html = await fetchMixPageHtml(parsed.fetchUrl);
    if (html) {
        const fromHtml = parseMixPlaylistFromHtml(html, limit);
        if (fromHtml.length > 0) {
            return fromHtml;
        }
    }

    if (parsed.seedVideoId) {
        const seed = await fetchSeedYouTubeVideo(parsed.seedVideoId);
        return [seed ?? buildSeedYouTubeVideo(parsed.seedVideoId)];
    }

    return [];
}

export async function fetchYoutubePlaylistVideos(
    playlistUrlOrId: string,
    options?: { limit?: number; fetchAll?: boolean },
): Promise<YouTubeVideo[]> {
    const parsed = parseYoutubePlaylistInput(playlistUrlOrId);
    const limit = options?.limit ?? 200;
    const fetchAll = options?.fetchAll ?? true;

    if (parsed.isMix) {
        return fetchMixPlaylist(parsed, { limit });
    }

    return fetchStandardPlaylistViaInnertube(parsed.listId, { limit, fetchAll });
}
