import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestRoom } from '@vkara/room/test-fixtures';
import type { YouTubeVideo } from '@vkara/youtube';

const { roomState, publishToRoom } = vi.hoisted(() => ({
    roomState: {
        current: { id: '4821', playingNow: null, videoQueue: [] } as unknown as ReturnType<
            typeof createTestRoom
        >,
    },
    publishToRoom: vi.fn(),
}));

vi.mock('@/utils/room-store', () => ({
    isVideoAlreadyInRoom: (
        room: { playingNow?: { id: string } | null; videoQueue: { id: string }[] },
        id: string,
    ) => room.playingNow?.id === id || room.videoQueue.some((v) => v.id === id),
    mutateRoom: vi.fn(
        async (_roomId: string, mutator: (room: typeof roomState.current) => void) => {
            mutator(roomState.current);
            return roomState.current;
        },
    ),
    requireRoom: vi.fn(async () => roomState.current),
}));

vi.mock('@/modules/youtube/resolve-embed-playability', () => ({
    checkEmbeddable: vi.fn(async () => true),
    filterYouTubeVideosByEmbeddability: vi.fn(async (_redis: unknown, videos: unknown[]) => videos),
}));

vi.mock('@/modules/room/room-broadcast', () => ({
    publishToRoom,
}));

vi.mock('@/redis', () => ({ redis: {} }));

import { ErrorCode } from '@vkara/room';
import { mutateRoom } from '@/utils/room-store';

import {
    addVideoToRoom,
    addVideosToRoom,
    nextVideoInRoom,
    playVideoNowInRoom,
    setAutoPlayCandidateInRoom,
} from '@/modules/room/room-commands';
import {
    checkEmbeddable,
    filterYouTubeVideosByEmbeddability,
} from '@/modules/youtube/resolve-embed-playability';

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

describe('nextVideoInRoom', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({ id: '4821' });
        publishToRoom.mockClear();
    });

    it('plays the autoplay candidate when the queue is empty and clears it', async () => {
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow?.id).toBe('related');
        expect(roomState.current.isPlaying).toBe(true);
        expect(roomState.current.historyQueue.map((item) => item.id)).toEqual(['now']);
        expect(roomState.current.videoQueue).toEqual([]);
        expect(roomState.current.autoPlayCandidate).toBeNull();
    });

    it('does not promote a candidate that cannot be embedded', async () => {
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };
        vi.mocked(checkEmbeddable).mockResolvedValueOnce(false);

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow).toBeNull();
        expect(roomState.current.autoPlayCandidate).toBeNull();
    });

    it('keeps a song that replaced the finished one while advance was resolving', async () => {
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };
        vi.mocked(mutateRoom).mockImplementationOnce(async (_roomId, mutator) => {
            roomState.current.playingNow = video('jumped');
            mutator(roomState.current);
            return roomState.current;
        });

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow?.id).toBe('jumped');
        expect(roomState.current.historyQueue).toEqual([]);
        expect(roomState.current.autoPlayCandidate).toBeNull();
    });

    it('still advances when the autoplay embed check throws', async () => {
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };
        vi.mocked(checkEmbeddable).mockRejectedValueOnce(new Error('youtube down'));

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow).toBeNull();
        expect(roomState.current.isPlaying).toBe(false);
        expect(publishToRoom).toHaveBeenCalledWith(
            '4821',
            expect.objectContaining({ type: 'roomUpdate' }),
        );
    });

    it('plays a song that was queued while the autoplay embed check was in flight', async () => {
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };
        vi.mocked(checkEmbeddable).mockImplementationOnce(async () => {
            roomState.current.videoQueue = [video('queued')];
            return true;
        });

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow?.id).toBe('queued');
        expect(roomState.current.videoQueue).toEqual([]);
        expect(roomState.current.historyQueue.map((item) => item.id)).toEqual(['now']);
        expect(roomState.current.autoPlayCandidate).toBeNull();
    });

    it('plays a retained song past the embed skip cap before one added during the check', async () => {
        const blocked = Array.from({ length: 25 }, (_, index) => video(`blocked-${index}`));
        roomState.current.playingNow = video('now');
        roomState.current.autoPlayNext = true;
        roomState.current.autoPlayCandidate = { video: video('related'), forVideoId: 'now' };
        roomState.current.videoQueue = [...blocked, video('retained')];
        vi.mocked(checkEmbeddable).mockImplementation(async (_redis, id: string) => {
            if (
                id === 'blocked-0' &&
                !roomState.current.videoQueue.some((item) => item.id === 'added')
            ) {
                roomState.current.videoQueue = [...roomState.current.videoQueue, video('added')];
            }
            return id === 'retained';
        });

        await nextVideoInRoom('4821');

        expect(roomState.current.playingNow?.id).toBe('retained');
        expect(roomState.current.videoQueue.map((item) => item.id)).toEqual(['added']);
        vi.mocked(checkEmbeddable).mockImplementation(async () => true);
    });
});

describe('setAutoPlayCandidateInRoom', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({
            id: '4821',
            autoPlayNext: true,
            playingNow: video('now'),
        });
        publishToRoom.mockClear();
        vi.mocked(checkEmbeddable).mockResolvedValue(true);
    });

    it('stores an embeddable related video', async () => {
        const stored = await setAutoPlayCandidateInRoom('4821', video('related'), 'now');

        expect(stored?.autoPlayCandidate?.video.id).toBe('related');
        expect(publishToRoom).toHaveBeenCalledWith(
            '4821',
            expect.objectContaining({ type: 'roomUpdate' }),
        );
    });

    it('does not store a video that cannot be embedded', async () => {
        vi.mocked(checkEmbeddable).mockResolvedValueOnce(false);

        const stored = await setAutoPlayCandidateInRoom('4821', video('blocked'), 'now');

        expect(stored).toBeNull();
        expect(roomState.current.autoPlayCandidate).toBeNull();
        expect(publishToRoom).not.toHaveBeenCalled();
    });
});

describe('addVideosToRoom', () => {
    beforeEach(() => {
        roomState.current = createTestRoom({ id: '4821' });
        publishToRoom.mockClear();
        vi.mocked(filterYouTubeVideosByEmbeddability).mockImplementation(
            async (_redis, videos) => videos,
        );
    });

    it('starts the first song and queues the rest when the room is empty', async () => {
        await addVideosToRoom('4821', [video('a'), video('b')]);
        expect(roomState.current.playingNow?.id).toBe('a');
        expect(roomState.current.videoQueue.map((item) => item.id)).toEqual(['b']);
    });

    it('appends songs and skips the one already playing', async () => {
        roomState.current.playingNow = video('now');
        await addVideosToRoom('4821', [video('now'), video('next')]);
        expect(roomState.current.playingNow?.id).toBe('now');
        expect(roomState.current.videoQueue.map((item) => item.id)).toEqual(['next']);
    });

    it('rejects when every video fails the embed check', async () => {
        vi.mocked(filterYouTubeVideosByEmbeddability).mockResolvedValueOnce([]);
        await expect(addVideosToRoom('4821', [video('a')])).rejects.toMatchObject({
            code: ErrorCode.VIDEO_NOT_FOUND,
        });
    });

    it('rejects when every song is already in the room', async () => {
        roomState.current.playingNow = video('a');
        roomState.current.videoQueue = [video('b')];
        await expect(addVideosToRoom('4821', [video('a'), video('b')])).rejects.toMatchObject({
            code: ErrorCode.ALREADY_IN_QUEUE,
        });
    });
});
