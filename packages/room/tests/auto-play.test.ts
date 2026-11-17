import { describe, expect, it } from 'vitest';

import type { YouTubeVideo } from '@vkara/youtube';

import {
    acceptAutoPlayCandidate,
    autoPlayVideoToPromote,
    pendingAutoPlayCandidate,
    reconcileAutoPlay,
} from '../src/auto-play';
import { createTestRoom } from '../src/test-fixtures';

function video(id: string, extra: Partial<YouTubeVideo> = {}): YouTubeVideo {
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
        thumbnails: [],
        ...extra,
    };
}

function roomWithCandidate() {
    return createTestRoom({
        autoPlayNext: true,
        playingNow: video('now'),
        autoPlayCandidate: { video: video('related'), forVideoId: 'now' },
    });
}

describe('reconcileAutoPlay', () => {
    it('keeps a candidate resolved for the current song while the queue is empty', () => {
        const room = roomWithCandidate();
        reconcileAutoPlay(room);
        expect(room.autoPlayCandidate?.video.id).toBe('related');
        expect(room.autoPlayCandidate?.forVideoId).toBe('now');
    });

    it('clears the candidate when the toggle is off', () => {
        const room = roomWithCandidate();
        room.autoPlayNext = false;
        reconcileAutoPlay(room);
        expect(room.autoPlayCandidate).toBeNull();
    });

    it('clears the candidate when the queue gains a song', () => {
        const room = roomWithCandidate();
        room.videoQueue = [video('queued')];
        reconcileAutoPlay(room);
        expect(room.autoPlayCandidate).toBeNull();
    });

    it('clears the candidate when it was resolved for a different song', () => {
        const room = roomWithCandidate();
        room.playingNow = video('other');
        reconcileAutoPlay(room);
        expect(room.autoPlayCandidate).toBeNull();
    });

    it('clears the candidate when nothing is playing', () => {
        const room = roomWithCandidate();
        room.playingNow = null;
        reconcileAutoPlay(room);
        expect(room.autoPlayCandidate).toBeNull();
    });
});

describe('acceptAutoPlayCandidate', () => {
    function openRoom() {
        return createTestRoom({ autoPlayNext: true, playingNow: video('now') });
    }

    it('stores a normal related video for the current song', () => {
        const room = openRoom();
        expect(acceptAutoPlayCandidate(room, video('related'), 'now')).toBe(true);
        expect(room.autoPlayCandidate?.video.id).toBe('related');
        expect(room.autoPlayCandidate?.forVideoId).toBe('now');
        expect(room.videoQueue).toEqual([]);
    });

    it.each([
        ['a live video', video('live', { isLive: true }), 'now'],
        ['a TikTok video', video('tt', { source: 'tiktok' }), 'now'],
        ['the song that is playing', video('now'), 'now'],
        ['a stale song id', video('related'), 'previous'],
    ])('rejects %s', (_label, candidate, forVideoId) => {
        const room = openRoom();
        expect(acceptAutoPlayCandidate(room, candidate, forVideoId)).toBe(false);
        expect(room.autoPlayCandidate).toBeNull();
    });

    it('rejects when the queue is not empty', () => {
        const room = openRoom();
        room.videoQueue = [video('queued')];
        expect(acceptAutoPlayCandidate(room, video('related'), 'now')).toBe(false);
        expect(room.autoPlayCandidate).toBeNull();
    });

    it('rejects when the toggle is off', () => {
        const room = openRoom();
        room.autoPlayNext = false;
        expect(acceptAutoPlayCandidate(room, video('related'), 'now')).toBe(false);
        expect(room.autoPlayCandidate).toBeNull();
    });
});

describe('autoPlayVideoToPromote', () => {
    it('returns the candidate when the song it was resolved for finishes', () => {
        expect(autoPlayVideoToPromote(roomWithCandidate(), 'now')?.id).toBe('related');
    });

    it('returns null for a different finished song', () => {
        expect(autoPlayVideoToPromote(roomWithCandidate(), 'other')).toBeNull();
        expect(autoPlayVideoToPromote(roomWithCandidate(), null)).toBeNull();
    });

    it('returns null when the queue is not empty or the toggle is off', () => {
        const queued = roomWithCandidate();
        queued.videoQueue = [video('queued')];
        expect(autoPlayVideoToPromote(queued, 'now')).toBeNull();

        const off = roomWithCandidate();
        off.autoPlayNext = false;
        expect(autoPlayVideoToPromote(off, 'now')).toBeNull();
    });

    it('does not change the room', () => {
        const room = roomWithCandidate();
        autoPlayVideoToPromote(room, 'now');
        expect(room).toEqual(roomWithCandidate());
    });
});

describe('pendingAutoPlayCandidate', () => {
    it('shows the candidate only while the slot is open for the current song', () => {
        expect(pendingAutoPlayCandidate(roomWithCandidate())?.id).toBe('related');
        expect(pendingAutoPlayCandidate(null)).toBeNull();

        const queued = roomWithCandidate();
        queued.videoQueue = [video('queued')];
        expect(pendingAutoPlayCandidate(queued)).toBeNull();
    });
});
