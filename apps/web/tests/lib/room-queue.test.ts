import type { YouTubeVideo } from '@vkara/shared-types';
import { describe, expect, it } from 'vitest';

import { isCurrentlyPlaying, isVideoInRoom } from '@/lib/room-queue';

function video(id: string): YouTubeVideo {
    const thumbUrl = `https://example.com/${id}.jpg`;
    return {
        id,
        title: id,
        duration: 180,
        duration_formatted: '3:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Channel', verified: false }],
        thumbnails: [{ url: thumbUrl, width: 120, height: 90 }],
    };
}

describe('room-queue', () => {
    it('isCurrentlyPlaying matches playingNow id only', () => {
        const room = {
            playingNow: video('abc'),
            videoQueue: [video('abc')],
        };

        expect(isCurrentlyPlaying(room, 'abc')).toBe(true);
        expect(isVideoInRoom(room, 'abc')).toBe(true);
        expect(isCurrentlyPlaying(room, 'other')).toBe(false);
    });
});
