import type { YouTubeThumbnailVariant, YouTubeVideo } from './youtube';

export type YoutubePlaylistMetadata = {
    id: string;
    title: string;
    videoCount: number;
    thumbnails?: YouTubeThumbnailVariant[];
    channelName?: string;
};

export type PlaylistDetailsResponse = {
    playlist: YoutubePlaylistMetadata;
    videos: YouTubeVideo[];
};

/** True when a playlist details payload is safe to cache (avoids locking in metadata-only failures). */
export function isCacheablePlaylistDetails(details: PlaylistDetailsResponse): boolean {
    if (details.videos.length > 0) {
        return true;
    }

    return details.playlist.videoCount <= 0;
}
