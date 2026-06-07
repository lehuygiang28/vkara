export interface SearchResults {
    items?: YouTubeVideo[];
    pageInfo: {
        totalResults: number;
        resultsPerPage: number;
    };
}

export type YouTubeChannel = {
    name: string;
    verified: boolean;
};

export type YouTubeThumbnailVariant = {
    url: string;
    width?: number;
    height?: number;
};

export type VideoSource = 'youtube' | 'tiktok';

export type YouTubeVideo = {
    id: string;
    duration: number;
    duration_formatted: string;
    title: string;
    type: string;
    uploadedAt: string;
    url: string;
    views: number;
    channels: YouTubeChannel[];
    /** Responsive thumbnail variants sorted ascending by pixel area. */
    thumbnails: YouTubeThumbnailVariant[];
    /** Active YouTube livestream (no fixed duration). */
    isLive?: boolean;
    /** Queue provider; omitted or `youtube` for InnerTube items. */
    source?: VideoSource;
    /** TikTok photo carousel slide count (from search `imagePost.images`). */
    tiktokImageCount?: number;
};

export function getVideoSource(video: Pick<YouTubeVideo, 'source'>): VideoSource {
    return video.source ?? 'youtube';
}

/** Legacy payloads may still include `channel`; normalize to `channels` for UI. */
export function normalizeVideoChannels(video: {
    channels?: YouTubeChannel[];
    channel?: { name: string; verified?: boolean };
}): YouTubeChannel[] {
    if (video.channels && video.channels.length > 0) {
        return video.channels;
    }
    if (video.channel?.name) {
        return [{ name: video.channel.name, verified: video.channel.verified ?? false }];
    }
    return [{ name: '—', verified: false }];
}
