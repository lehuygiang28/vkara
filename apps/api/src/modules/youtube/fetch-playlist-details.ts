import type { Playlist } from 'youtubei';
import type { PlaylistDetailsResponse, YouTubeThumbnailVariant, YouTubeVideo } from '@vkara/youtube';
import { buildYouTubeThumbnails, parseYoutubePlaylistInput } from '@vkara/youtube';

import { createContextLogger } from '@/utils/logger';

import { fetchYoutubePlaylistVideos } from './fetch-playlist-videos';
import { getYoutubeiClient } from './youtubei-client';

const logger = createContextLogger('FetchPlaylistDetails');

function mapPlaylistThumbnails(
    playlistId: string,
    thumbnails?: { url?: string; width?: number; height?: number }[],
): YouTubeThumbnailVariant[] {
    const variants = (thumbnails ?? [])
        .filter((thumb): thumb is { url: string; width?: number; height?: number } =>
            Boolean(thumb.url),
        )
        .map((thumb) => ({
            url: thumb.url,
            width: thumb.width,
            height: thumb.height,
        }));

    if (variants.length === 0) {
        return [];
    }

    return buildYouTubeThumbnails(playlistId, variants);
}

function buildMixPlaylistMetadata(
    listId: string,
    videos: YouTubeVideo[],
): PlaylistDetailsResponse['playlist'] {
    const firstThumb = videos[0]?.thumbnails?.[0];
    return {
        id: listId,
        title: videos[0]?.title ? `Mix: ${videos[0].title}` : 'YouTube Mix',
        videoCount: videos.length,
        thumbnails: firstThumb ? [firstThumb] : mapPlaylistThumbnails(listId),
        channelName: videos[0]?.channels[0]?.name,
    };
}

async function fetchStandardPlaylistMetadata(
    listId: string,
): Promise<PlaylistDetailsResponse['playlist'] | null> {
    const client = getYoutubeiClient();

    try {
        const playlist = await client.getPlaylist<Playlist>(listId);
        if (!playlist?.id) {
            return null;
        }

        const thumbs =
            playlist.thumbnails && playlist.thumbnails.length > 0
                ? [...playlist.thumbnails].map((thumb) => ({
                      url: thumb.url,
                      width: thumb.width,
                      height: thumb.height,
                  }))
                : playlist.thumbnails?.best
                  ? [{ url: playlist.thumbnails.best }]
                  : undefined;

        return {
            id: playlist.id,
            title: playlist.title || 'Untitled playlist',
            videoCount: playlist.videoCount ?? playlist.videos.items.length,
            thumbnails: mapPlaylistThumbnails(playlist.id, thumbs),
            channelName: playlist.channel?.name,
        };
    } catch (error) {
        logger.warn('Failed to fetch standard playlist metadata', { error, listId });
        return null;
    }
}

export async function fetchYoutubePlaylistDetails(
    playlistUrlOrId: string,
    options?: { limit?: number; fetchAll?: boolean; videoLimit?: number },
): Promise<PlaylistDetailsResponse> {
    const parsed = parseYoutubePlaylistInput(playlistUrlOrId);
    const videoLimit = options?.videoLimit ?? options?.limit ?? 200;
    const fetchAll = options?.fetchAll ?? options?.videoLimit === undefined;

    // TODO(phase-2): Same metadata gap as WS import — videos lack views/verified until
    // playlist path uses prepareYoutubeVideos (rate-limit research required).
    const videos = await fetchYoutubePlaylistVideos(playlistUrlOrId, {
        limit: videoLimit,
        fetchAll,
    });

    if (parsed.isMix) {
        return {
            playlist: buildMixPlaylistMetadata(parsed.listId, videos),
            videos,
        };
    }

    const metadata = await fetchStandardPlaylistMetadata(parsed.listId);

    return {
        playlist: metadata ?? {
            id: parsed.listId,
            title: 'Untitled playlist',
            videoCount: videos.length,
            thumbnails: mapPlaylistThumbnails(parsed.listId),
        },
        videos,
    };
}
