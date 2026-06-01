import { describe, expect, it } from 'bun:test';

import { isCurrentlyPlaying, isVideoInRoom } from './room-queue';

describe('room-queue', () => {
    it('isCurrentlyPlaying matches playingNow id only', () => {
        const room = {
            playingNow: { id: 'abc' },
            videoQueue: [{ id: 'abc' }],
        };

        expect(isCurrentlyPlaying(room, 'abc')).toBe(true);
        expect(isVideoInRoom(room, 'abc')).toBe(true);
        expect(isCurrentlyPlaying(room, 'other')).toBe(false);
    });
});
