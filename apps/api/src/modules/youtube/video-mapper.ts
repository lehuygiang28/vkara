import type { VideoCompact } from 'youtubei';

import type { YouTubeVideo } from '@vkara/shared-types';
import { formatSeconds } from '@/utils/common';

type VideoChannel = YouTubeVideo['channels'][number];

interface MapYoutubeiVideoOptions {
    channels?: VideoChannel[];
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

    return {
        id: video.id,
        duration: video.duration || 0,
        duration_formatted: formatSeconds(video.duration),
        thumbnail: {
            url: video.thumbnails[0].url,
        },
        title: video.title,
        type: 'video',
        url: '',
        uploadedAt: video.uploadDate || '',
        views: video.viewCount || 0,
        channel: {
            name: channels[0].name,
            verified: channels[0].verified,
        },
        channels,
    };
};
