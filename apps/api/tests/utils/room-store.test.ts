import type { YouTubeVideo } from '@vkara/youtube';
import { createTestRoom } from '@vkara/room/test-fixtures';
import { describe, expect, it } from 'vitest';

import { isVideoAlreadyInRoom } from '@/utils/room-store';

function video(id: string): YouTubeVideo {
    return {
        id,
        title: id,
        duration: 0,
        duration_formatted: '0:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Ch', verified: false }],
        thumbnails: [{ url: 'https://example.com/t.jpg', width: 120, height: 90 }],
    };
}

function room(overrides: Parameters<typeof createTestRoom>[0] = {}) {
    return createTestRoom({ id: '1234', ...overrides });
}

describe('isVideoAlreadyInRoom', () => {
    it('returns true when id is in queue or now playing', () => {
        expect(isVideoAlreadyInRoom(room({ videoQueue: [video('a')] }), 'a')).toBe(true);
        expect(isVideoAlreadyInRoom(room({ playingNow: video('b') }), 'b')).toBe(true);
    });

    it('returns false when id is absent', () => {
        expect(isVideoAlreadyInRoom(room({ videoQueue: [video('a')] }), 'b')).toBe(false);
        expect(isVideoAlreadyInRoom(room(), 'x')).toBe(false);
    });

    it('prefers playingNow over duplicate queue entry', () => {
        const r = room({
            playingNow: video('dup'),
            videoQueue: [video('dup')],
        });
        expect(isVideoAlreadyInRoom(r, 'dup')).toBe(true);
    });
});
