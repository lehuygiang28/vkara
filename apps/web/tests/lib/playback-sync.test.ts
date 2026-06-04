import { describe, expect, it } from 'vitest';

import {
    acceptSyncPlaybackPositionTime,
    needsPlaybackSeekCorrection,
    PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC,
} from '@vkara/room';

describe('acceptSyncPlaybackPositionTime', () => {
    it('rejects backward position sync', () => {
        expect(acceptSyncPlaybackPositionTime(120, 0)).toBeNull();
        expect(acceptSyncPlaybackPositionTime(120, 119)).toBeNull();
    });

    it('accepts forward or equal position sync', () => {
        expect(acceptSyncPlaybackPositionTime(120, 120)).toBe(120);
        expect(acceptSyncPlaybackPositionTime(120, 125)).toBe(125);
    });

    it('floors fractional seconds', () => {
        expect(acceptSyncPlaybackPositionTime(10.9, 10.2)).toBe(10);
    });
});

describe('needsPlaybackSeekCorrection', () => {
    it('is false within drift tolerance', () => {
        expect(needsPlaybackSeekCorrection(100, 100 + PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC)).toBe(
            false,
        );
    });

    it('is true when drift exceeds tolerance', () => {
        expect(
            needsPlaybackSeekCorrection(0, 100 + PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC + 1),
        ).toBe(true);
    });
});
