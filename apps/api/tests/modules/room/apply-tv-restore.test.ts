import type { Room } from '@vkara/room';
import { createTestRoom } from '@vkara/room/test-fixtures';
import type { TvRoomRestoreState } from '@vkara/validators/ws/client-message';
import { describe, expect, it } from 'vitest';

import { applyTvRestoreToRoom, clampRestoreState } from '@/modules/room/apply-tv-restore';

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
            captionsLanguage: 'en',
            captionTracks: [{ languageCode: 'en', displayName: 'English' }],
            captionTracksVideoId: 'v1',
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
        };

        const clamped = clampRestoreState(restore);
        expect(clamped.captionsEnabled).toBe(true);
        expect(clamped.captionTracks).toHaveLength(1);
        expect(clamped.videoQueue).toHaveLength(200);
        expect(clamped.volume).toBe(100);
        expect(clamped.currentTime).toBe(0);
    });

    it('applies restore without history', () => {
        const room = createTestRoom({
            historyQueue: [{ id: 'old' } as Room['historyQueue'][0]],
        });

        applyTvRestoreToRoom(room, {
            videoQueue: [{ id: 'q1' } as Room['videoQueue'][0]],
            playingNow: { id: 'now' } as Room['playingNow'],
            isPlaying: true,
            currentTime: 12,
            volume: 80,
            showQRInPlayer: false,
            captionsEnabled: true,
            captionsLanguage: 'en',
            captionTracks: [],
            captionTracksVideoId: 'now',
            tiktokPhotoIndex: 2,
            tiktokPhotoMaxIndex: 4,
        });

        expect(room.historyQueue).toEqual([]);
        expect(room.videoQueue).toHaveLength(1);
        expect(room.playingNow?.id).toBe('now');
        expect(room.isPlaying).toBe(true);
        expect(room.currentTime).toBe(12);
        expect(room.volume).toBe(80);
        expect(room.showQRInPlayer).toBe(false);
        expect(room.captionsEnabled).toBe(true);
        expect(room.tiktokPhotoIndex).toBe(2);
        expect(room.tiktokPhotoMaxIndex).toBe(4);
    });

    it('clamps caption track list length', () => {
        const tracks = Array.from({ length: 80 }, (_, i) => ({
            languageCode: `l${i}`,
            displayName: `Lang ${i}`,
        }));
        const clamped = clampRestoreState({
            videoQueue: [],
            playingNow: null,
            isPlaying: false,
            currentTime: 0,
            volume: 50,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: 'vi',
            captionTracks: tracks,
            captionTracksVideoId: null,
            tiktokPhotoIndex: 0,
            tiktokPhotoMaxIndex: 0,
        });

        expect(clamped.captionTracks).toHaveLength(64);
        expect(clamped.captionTracks[0]?.languageCode).toBe('l0');
    });

    it('clamps hostile restore numbers without throwing', () => {
        const clamped = clampRestoreState({
            videoQueue: [],
            playingNow: null,
            isPlaying: true,
            currentTime: Number.NaN,
            volume: Number.POSITIVE_INFINITY,
            showQRInPlayer: true,
            captionsEnabled: true,
            captionsLanguage: '  vi  ',
            captionTracks: [
                {
                    languageCode: 'x'.repeat(200),
                    displayName: 'y'.repeat(500),
                },
            ],
            captionTracksVideoId: null,
            tiktokPhotoIndex: -3,
            tiktokPhotoMaxIndex: 1.8,
        });

        expect(Number.isNaN(clamped.currentTime)).toBe(true);
        expect(clamped.tiktokPhotoIndex).toBe(0);
        expect(clamped.tiktokPhotoMaxIndex).toBe(1);
        expect(clamped.volume).toBe(100);
        expect(clamped.captionTracks).toHaveLength(1);
        expect(clamped.captionTracks[0]?.languageCode.length).toBeGreaterThan(64);
    });
});
