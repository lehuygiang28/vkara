import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

import {
    beginVolumeGesture,
    endVolumeGesture,
    markVolumeSentToRoom,
    resetVolumeRemoteSyncForTests,
    shouldApplyRemoteVolumeChange,
} from '@/lib/volume-remote-sync';

describe('volume-remote-sync', () => {
    beforeEach(() => {
        resetVolumeRemoteSyncForTests();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('ignores remote volume while a local gesture is active', () => {
        beginVolumeGesture();
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);
    });

    it('ignores stale echoes until the expected volume arrives', () => {
        markVolumeSentToRoom(60);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);
        expect(shouldApplyRemoteVolumeChange(60)).toBe(true);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(true);
    });

    it('accepts remote volume again after the echo window expires', () => {
        markVolumeSentToRoom(60);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);

        vi.advanceTimersByTime(801);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(true);
    });

    it('tracks the final volume after a gesture ends', () => {
        beginVolumeGesture();
        expect(shouldApplyRemoteVolumeChange(20)).toBe(false);

        endVolumeGesture(75);
        expect(shouldApplyRemoteVolumeChange(20)).toBe(false);
        expect(shouldApplyRemoteVolumeChange(75)).toBe(true);
    });
});
