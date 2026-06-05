import { describe, expect, it, beforeEach } from 'vitest';

import {
    beginVolumeGesture,
    endVolumeGesture,
    resetVolumeRemoteSyncForTests,
    shouldApplyRemoteVolumeChange,
} from '@/lib/remote-gesture-sync';

describe('volume remote gesture sync', () => {
    beforeEach(() => {
        resetVolumeRemoteSyncForTests();
    });

    it('ignores remote volume while a local gesture is active', () => {
        beginVolumeGesture(40);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);
    });

    it('ignores stale echoes until the expected volume arrives', () => {
        beginVolumeGesture(40);
        endVolumeGesture(60);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);
        expect(shouldApplyRemoteVolumeChange(60)).toBe(true);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(true);
    });

    it('accepts unexpected remote values from another client', () => {
        beginVolumeGesture(40);
        endVolumeGesture(60);
        expect(shouldApplyRemoteVolumeChange(40)).toBe(false);
        expect(shouldApplyRemoteVolumeChange(55)).toBe(true);
    });

    it('tracks the final volume after a gesture ends', () => {
        beginVolumeGesture(20);
        expect(shouldApplyRemoteVolumeChange(20)).toBe(false);

        endVolumeGesture(75);
        expect(shouldApplyRemoteVolumeChange(20)).toBe(false);
        expect(shouldApplyRemoteVolumeChange(75)).toBe(true);
    });
});
