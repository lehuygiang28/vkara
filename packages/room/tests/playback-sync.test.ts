import { describe, expect, it } from 'vitest';

import {
    acceptSyncPlaybackPositionTime,
    computeExtrapolatedPlaybackSeconds,
    isPlaybackPositionForActiveVideo,
    needsPlaybackSeekCorrection,
    PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC,
    PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC,
    PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS,
    shouldBroadcastPlaybackTime,
} from '../src/playback-sync';

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
        expect(needsPlaybackSeekCorrection(0, 100 + PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC + 1)).toBe(
            true,
        );
    });
});

describe('computeExtrapolatedPlaybackSeconds', () => {
    it('returns floored base when paused', () => {
        expect(
            computeExtrapolatedPlaybackSeconds(
                {
                    baseSeconds: 42.9,
                    syncedAtMs: 1_000,
                    isPlaying: false,
                    videoId: 'v1',
                },
                5_000,
            ),
        ).toBe(42);
    });

    it('adds elapsed time while playing', () => {
        expect(
            computeExtrapolatedPlaybackSeconds(
                {
                    baseSeconds: 10,
                    syncedAtMs: 1_000,
                    isPlaying: true,
                    videoId: 'v1',
                },
                4_500,
            ),
        ).toBe(13);
    });

    it('never returns negative seconds', () => {
        expect(
            computeExtrapolatedPlaybackSeconds(
                {
                    baseSeconds: -1,
                    syncedAtMs: 0,
                    isPlaying: false,
                    videoId: null,
                },
                100,
            ),
        ).toBe(0);
    });
});

describe('shouldBroadcastPlaybackTime', () => {
    const t0 = 1_000_000;

    it('broadcasts on first sample without last state', () => {
        expect(shouldBroadcastPlaybackTime(undefined, 5, 5, t0)).toBe(true);
    });

    it('broadcasts when jump from previous exceeds min delta', () => {
        expect(
            shouldBroadcastPlaybackTime(
                { at: t0, seconds: 0 },
                5 + PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC,
                5,
                t0 + 100,
            ),
        ).toBe(true);
    });

    it('broadcasts when jump from last broadcast exceeds min delta', () => {
        expect(
            shouldBroadcastPlaybackTime(
                { at: t0, seconds: 0 },
                PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC,
                0,
                t0 + 100,
            ),
        ).toBe(true);
    });

    it('broadcasts after min interval for small deltas', () => {
        expect(
            shouldBroadcastPlaybackTime(
                { at: t0, seconds: 100 },
                101,
                100,
                t0 + PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS,
            ),
        ).toBe(true);
    });

    it('suppresses frequent small updates within interval', () => {
        expect(
            shouldBroadcastPlaybackTime(
                { at: t0, seconds: 100 },
                101,
                100,
                t0 + PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS - 1,
            ),
        ).toBe(false);
    });

    it('broadcasts on negative delta magnitude from previous', () => {
        expect(shouldBroadcastPlaybackTime({ at: t0, seconds: 50 }, 40, 50, t0 + 100)).toBe(true);
    });
});

describe('acceptSyncPlaybackPositionTime edge cases', () => {
    it('clamps negative values to zero before comparison', () => {
        expect(acceptSyncPlaybackPositionTime(-5, 0)).toBe(0);
        expect(acceptSyncPlaybackPositionTime(0, -3)).toBe(0);
        expect(acceptSyncPlaybackPositionTime(5, -1)).toBeNull();
    });
});

describe('isPlaybackPositionForActiveVideo', () => {
    it('matches only when both ids are present and equal', () => {
        expect(isPlaybackPositionForActiveVideo('a', 'a')).toBe(true);
        expect(isPlaybackPositionForActiveVideo('a', 'b')).toBe(false);
        expect(isPlaybackPositionForActiveVideo('a', null)).toBe(false);
        expect(isPlaybackPositionForActiveVideo(null, 'a')).toBe(false);
    });
});
