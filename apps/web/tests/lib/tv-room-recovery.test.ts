import { ErrorCode } from '@vkara/room';
import { describe, expect, it } from 'vitest';

import {
    buildTvRecoveryCreateRoomMessage,
    captureTvRoomSnapshot,
    isTvLayoutMode,
    shouldRecoverTvRoom,
} from '@/lib/tv-room-recovery';

describe('tv-room-recovery', () => {
    it('captures snapshot with previous room id', () => {
        const snapshot = captureTvRoomSnapshot({
            id: '5678',
            password: 'secret',
            videoQueue: [{ id: 'a' } as never],
            historyQueue: [{ id: 'h' } as never],
            volume: 70,
            showQRInPlayer: true,
            captionsEnabled: false,
            captionsLanguage: 'vi',
            captionTracks: [],
            captionTracksVideoId: null,
            playingNow: null,
            lastActivity: 0,
            creatorId: 'x',
            isPlaying: false,
            currentTime: 0,
        });

        expect(snapshot?.previousRoomId).toBe('5678');
        expect(snapshot?.restore.videoQueue).toHaveLength(1);
        expect(buildTvRecoveryCreateRoomMessage(snapshot!).preferredRoomId).toBe('5678');
    });

    it('shouldRecoverTvRoom only for TV layout', () => {
        expect(
            shouldRecoverTvRoom('errorWithCode', ErrorCode.REJOIN_ROOM_NOT_FOUND, true),
        ).toBe(true);
        expect(
            shouldRecoverTvRoom('errorWithCode', ErrorCode.REJOIN_ROOM_NOT_FOUND, false),
        ).toBe(false);
        expect(shouldRecoverTvRoom('roomClosed', undefined, true)).toBe(false);
    });

    it('does not recover for unrelated error codes on TV', () => {
        expect(
            shouldRecoverTvRoom('errorWithCode', ErrorCode.INCORRECT_PASSWORD, true),
        ).toBe(false);
        expect(shouldRecoverTvRoom('roomUpdate', undefined, true)).toBe(false);
    });

    it('returns null snapshot for invalid room', () => {
        expect(captureTvRoomSnapshot(null)).toBeNull();
        expect(captureTvRoomSnapshot({ id: '' } as never)).toBeNull();
    });

    it('isTvLayoutMode treats non-remote as TV', () => {
        expect(isTvLayoutMode('player')).toBe(true);
        expect(isTvLayoutMode('remote')).toBe(false);
    });
});
