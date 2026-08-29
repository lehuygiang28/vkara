import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestRoom } from '@vkara/room/test-fixtures';
import type { YouTubeVideo } from '@vkara/youtube';

const { roomState, publishToRoom } = vi.hoisted(() => ({
    roomState: {
        current: { id: '4821', playingNow: null, videoQueue: [] } as unknown as ReturnType<typeof createTestRoom>,
    },
    publishToRoom: vi.fn(),
}));

vi.mock('@/utils/room-store', () => ({
    isVideoAlreadyInRoom: (room: { playingNow?: { id: string } | null; videoQueue: { id: string }[] }, id: string) =>
        room.playingNow?.id === id || room.videoQueue.some((v) => v.id === id),
    mutateRoom: vi.fn(async (_roomId: string, mutator: (room: typeof roomState.current) => void) => {
        mutator(roomState.current);
        return roomState.current;
    }),
    requireRoom: vi.fn(async () => roomState.current),
}));

vi.mock('@/modules/youtube/resolve-embed-playability', () => ({
    checkEmbeddable: vi.fn(async () => true),
}));

vi.mock('@/modules/room/room-broadcast', () => ({
    publishToRoom,
}));

vi.mock('@/redis', () => ({ redis: {} }));

import { addVideoToRoom, playVideoNowInRoom } from '@/modules/room/room-commands';

function video(id: string): YouTubeVideo {
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
        thumbnails: [{ url: `https://example.com/${id}.jpg`, width: 120, height: 90 }],
    };
}

describe('addVideoToRoom', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({ id: '4821' });
        publishToRoom.mockClear();
    });

    it('starts playback when the queue is empty and publishes roomUpdate', async () => {
        const song = video('abc');
        await addVideoToRoom('4821', song);
        expect(roomState.current.playingNow?.id).toBe('abc');
        expect(publishToRoom).toHaveBeenCalledWith(
            '4821',
            expect.objectContaining({ type: 'roomUpdate' }),
        );
    });

    it('appends when something is already playing', async () => {
        roomState.current.playingNow = video('now');
        await addVideoToRoom('4821', video('next'));
        expect(roomState.current.videoQueue.map((item) => item.id)).toEqual(['next']);
    });
});

describe('playVideoNowInRoom', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({ id: '4821' });
        publishToRoom.mockClear();
    });

    it('starts the requested video and publishes roomUpdate', async () => {
        roomState.current.playingNow = video('now');
        await playVideoNowInRoom('4821', video('jump'));
        expect(roomState.current.playingNow?.id).toBe('jump');
        expect(publishToRoom).toHaveBeenCalledWith(
            '4821',
            expect.objectContaining({ type: 'roomUpdate' }),
        );
    });
});
