import type { VideoCompact } from 'youtubei';

import type { YouTubeVideo } from '@vkara/shared-types';
import { formatSeconds } from '@/utils/common';

export const mapYoutubeiVideo = (video: VideoCompact): YouTubeVideo => ({
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
        name: video.channel?.name || 'N/A',
        verified: false,
    },
});
