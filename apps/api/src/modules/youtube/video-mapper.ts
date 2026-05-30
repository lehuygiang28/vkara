import type { VideoCompact } from 'youtubei';

import type { YouTubeVideo } from '@vkara/shared-types';
import { resolveYoutubeLiveFlag } from '@vkara/shared-utils';
import { formatSeconds } from '@/utils/common';

type VideoChannel = YouTubeVideo['channels'][number];

interface MapYoutubeiVideoOptions {
    channels?: VideoChannel[];
    views?: number;
}

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
            url: video.thumbnails[0].url,
        },
        title: video.title,
        type: 'video',
        url: '',
        uploadedAt: video.uploadDate || '',
        views: options.views !== undefined ? options.views : (video.viewCount ?? 0),
        channels,
        isLive,
    };
};
