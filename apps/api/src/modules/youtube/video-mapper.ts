import type { LiveVideo, Video, VideoCompact } from 'youtubei';

import type { YouTubeVideo } from '@vkara/shared-types';
import { resolveYoutubeLiveFlag } from '@vkara/shared-utils';
import { formatSeconds } from '@/utils/common';

type VideoChannel = YouTubeVideo['channels'][number];

interface MapYoutubeiVideoOptions {
    channels?: VideoChannel[];
    views?: number;
}

/** youtubei `thumbnails.best` is a URL string; array entries are `{ url, width, height }`. */
export function resolveYoutubeiThumbnailUrl(
    videoId: string,
    thumbnails?: VideoCompact['thumbnails'],
): string {
    if (thumbnails?.length) {
        const best = thumbnails.best as unknown;
        if (typeof best === 'string' && best.length > 0) {
            return best;
        }

        const fromLast = thumbnails[thumbnails.length - 1]?.url;
        if (fromLast) return fromLast;

        const fromFirst = thumbnails[0]?.url;
        if (fromFirst) return fromFirst;
    }

    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
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
        thumbnail: {
            url: resolveYoutubeiThumbnailUrl(video.id, video.thumbnails),
        },
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
        thumbnail: {
            url: resolveYoutubeiThumbnailUrl(video.id, video.thumbnails),
        },
        title: video.title,
        type: 'video',
        url: `https://www.youtube.com/watch?v=${video.id}`,
        uploadedAt: video.uploadDate ?? '',
        views: options.views !== undefined ? options.views : (video.viewCount ?? 0),
        channels,
        isLive,
    };
};
