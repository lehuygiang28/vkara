import type { LiveVideo, Video, VideoCompact } from 'youtubei';

import type { YouTubeThumbnailVariant, YouTubeVideo } from '@vkara/youtube';
import { buildYouTubeThumbnails, formatSeconds, resolveYoutubeLiveFlag } from '@vkara/youtube';

type VideoChannel = YouTubeVideo['channels'][number];

interface MapYoutubeiVideoOptions {
    channels?: VideoChannel[];
    views?: number;
}

function collectYoutubeiVariants(thumbnails?: VideoCompact['thumbnails']): YouTubeThumbnailVariant[] {
    const variants: YouTubeThumbnailVariant[] = [];

    if (!thumbnails?.length) {
        return variants;
    }

    for (const entry of thumbnails) {
        if (!entry?.url) {
            continue;
        }

        variants.push({
            url: entry.url,
            width: entry.width,
            height: entry.height,
        });
    }

    return variants;
}

/** Map youtubei thumbnails and enrich with canonical i.ytimg.com sizes. */
export function mapYoutubeiThumbnails(
    videoId: string,
    thumbnails?: VideoCompact['thumbnails'],
): YouTubeThumbnailVariant[] {
    return buildYouTubeThumbnails(videoId, collectYoutubeiVariants(thumbnails));
}

export const mapYoutubeiFullVideo = (video: Video | LiveVideo): YouTubeVideo => {
    const duration = 'duration' in video ? (video.duration ?? 0) : 0;
    const isLive = resolveYoutubeLiveFlag({
        isLive: video.isLiveContent,
        duration,
        uploadDate: video.uploadDate,
    });

    return {
        id: video.id,
        duration: isLive ? 0 : duration,
        duration_formatted: isLive ? '' : formatSeconds(duration),
        thumbnails: mapYoutubeiThumbnails(video.id, video.thumbnails),
        title: video.title,
        type: 'video',
        url: `https://www.youtube.com/watch?v=${video.id}`,
        uploadedAt: video.uploadDate ?? '',
        views: video.viewCount ?? 0,
        channels: [
            {
                name: video.channel?.name || 'N/A',
                verified: false,
            },
        ],
        isLive,
    };
};

/** Default mapper; playlist import uses this without prepareYoutubeVideos — TODO(phase-2). */
export const mapYoutubeiVideo = (
    video: VideoCompact,
    options: MapYoutubeiVideoOptions = {},
): YouTubeVideo => {
    const fallbackChannels: VideoChannel[] = [
        {
            name: video.channel?.name || 'N/A',
            verified: false,
        },
    ];
    const channels =
        options.channels && options.channels.length > 0
            ? options.channels
            : fallbackChannels;

    const isLive = resolveYoutubeLiveFlag({
        isLive: video.isLive,
        duration: video.duration,
        uploadDate: video.uploadDate,
    });

    return {
        id: video.id,
        duration: isLive ? 0 : video.duration || 0,
        duration_formatted: isLive ? '' : formatSeconds(video.duration),
        thumbnails: mapYoutubeiThumbnails(video.id, video.thumbnails),
        title: video.title,
        type: 'video',
        url: `https://www.youtube.com/watch?v=${video.id}`,
        uploadedAt: video.uploadDate ?? '',
        views: options.views !== undefined ? options.views : (video.viewCount ?? 0),
        channels,
        isLive,
    };
};
