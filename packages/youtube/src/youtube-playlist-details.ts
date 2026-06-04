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
