import { describe, expect, it } from 'bun:test';

import type { Room, TvRoomRestoreState } from '@vkara/shared-types';

import { applyTvRestoreToRoom, clampRestoreState } from './apply-tv-restore';

describe('apply-tv-restore', () => {
    it('clamps queue length and volume', () => {
        const restore: TvRoomRestoreState = {
            videoQueue: Array.from({ length: 250 }, (_, i) => ({
                id: `v${i}`,
            })) as TvRoomRestoreState['videoQueue'],
            playingNow: null,
            isPlaying: false,
            currentTime: -5,
            volume: 150,
            showQRInPlayer: false,
            captionsEnabled: true,
        };

        const clamped = clampRestoreState(restore);
        expect(clamped.captionsEnabled).toBe(true);
        expect(clamped.videoQueue).toHaveLength(200);
        expect(clamped.volume).toBe(100);
        expect(clamped.currentTime).toBe(0);
    });

    it('applies restore without history', () => {
        const room: Room = {
            id: '1234',
            clients: [],
            videoQueue: [],
            historyQueue: [{ id: 'old' } as Room['historyQueue'][0]],
            volume: 50,
            showQRInPlayer: true,
            captionsEnabled: false,
            playingNow: null,
            lastActivity: 0,
            creatorId: 'c1',
            isPlaying: false,
            currentTime: 0,
        };

        applyTvRestoreToRoom(room, {
            videoQueue: [{ id: 'q1' } as Room['videoQueue'][0]],
            playingNow: { id: 'now' } as Room['playingNow'],
            isPlaying: true,
            currentTime: 12,
            volume: 80,
            showQRInPlayer: false,
            captionsEnabled: true,
        });

        expect(room.historyQueue).toEqual([]);
        expect(room.videoQueue).toHaveLength(1);
        expect(room.playingNow?.id).toBe('now');
        expect(room.isPlaying).toBe(true);
        expect(room.currentTime).toBe(12);
        expect(room.volume).toBe(80);
        expect(room.showQRInPlayer).toBe(false);
        expect(room.captionsEnabled).toBe(true);
    });
});
