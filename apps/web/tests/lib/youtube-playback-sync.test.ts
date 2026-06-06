import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyPreferredPlaybackQuality,
    applyRoomPlaybackToPlayer,
    loadTrackOnPlayer,
    clearPlaybackBroadcastSuppression,
    hasPendingUserSeek,
    isPlayerActuallyPlaying,
    isYoutubeActivelyPlaying,
    isYoutubeExplicitlyPaused,
    isYoutubePlaybackIntentState,
    markServerPlaybackCommand,
    markUserSeekTarget,
    resetPlaybackSyncForTests,
    shouldApplyRemoteCurrentTime,
    shouldSuppressPlaybackBroadcast,
} from '@/lib/youtube-playback-sync';

function mockPlayer(state: number): YT.Player {
    return {
        getPlayerState: () => state,
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
    } as unknown as YT.Player;
}

describe('loadTrackOnPlayer', () => {
    it('loads and plays when room intends play', () => {
        const player = {
            loadVideoById: vi.fn(),
            cueVideoById: vi.fn(),
        } as unknown as YT.Player;

        loadTrackOnPlayer(player, 'next-track', true);
        expect(player.loadVideoById).toHaveBeenCalledWith('next-track');
        expect(player.cueVideoById).not.toHaveBeenCalled();
    });

    it('cues without autoplay when room is paused', () => {
        const player = {
            loadVideoById: vi.fn(),
            cueVideoById: vi.fn(),
        } as unknown as YT.Player;

        loadTrackOnPlayer(player, 'next-track', false);
        expect(player.cueVideoById).toHaveBeenCalledWith('next-track');
        expect(player.loadVideoById).not.toHaveBeenCalled();
    });
});

describe('applyRoomPlaybackToPlayer', () => {
    beforeEach(() => {
        vi.stubGlobal('YT', {
            PlayerState: {
                UNSTARTED: -1,
                ENDED: 0,
                PLAYING: 1,
                PAUSED: 2,
                BUFFERING: 3,
                CUED: 5,
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('starts playback when room is playing and embed is paused', () => {
        const player = mockPlayer(YT.PlayerState.PAUSED);
        applyRoomPlaybackToPlayer(player, true);
        expect(player.playVideo).toHaveBeenCalledTimes(1);
        expect(player.pauseVideo).not.toHaveBeenCalled();
    });

    it('pauses when room is paused and embed is playing', () => {
        const player = mockPlayer(YT.PlayerState.PLAYING);
        applyRoomPlaybackToPlayer(player, false);
        expect(player.pauseVideo).toHaveBeenCalledTimes(1);
        expect(player.playVideo).not.toHaveBeenCalled();
    });

    it('does not pause when embed is already paused', () => {
        const player = mockPlayer(YT.PlayerState.PAUSED);
        applyRoomPlaybackToPlayer(player, false);
        expect(player.pauseVideo).not.toHaveBeenCalled();
    });

    it('does not play when embed is already playing', () => {
        const player = mockPlayer(YT.PlayerState.PLAYING);
        applyRoomPlaybackToPlayer(player, true);
        expect(player.playVideo).not.toHaveBeenCalled();
    });

    it('does not play when embed is buffering and room is playing', () => {
        const player = mockPlayer(YT.PlayerState.BUFFERING);
        applyRoomPlaybackToPlayer(player, true);
        expect(player.playVideo).not.toHaveBeenCalled();
    });
});

describe('shouldSuppressPlaybackBroadcast', () => {
    beforeEach(() => {
        resetPlaybackSyncForTests();
    });

    it('suppresses echo feedback until explicitly cleared', () => {
        markServerPlaybackCommand();
        expect(shouldSuppressPlaybackBroadcast()).toBe(true);
        clearPlaybackBroadcastSuppression();
        expect(shouldSuppressPlaybackBroadcast()).toBe(false);
    });

    it('stays suppressed while a user seek is pending', () => {
        markUserSeekTarget(0, 42);
        expect(hasPendingUserSeek()).toBe(true);
        expect(shouldSuppressPlaybackBroadcast()).toBe(true);
        expect(shouldApplyRemoteCurrentTime(0, 0)).toBe(true);
        expect(hasPendingUserSeek()).toBe(false);
        expect(shouldSuppressPlaybackBroadcast()).toBe(false);
    });
});

describe('shouldApplyRemoteCurrentTime', () => {
    beforeEach(() => {
        resetPlaybackSyncForTests();
    });

    it('rejects stale positions until the expected seek target arrives', () => {
        markUserSeekTarget(110, 100);
        expect(shouldApplyRemoteCurrentTime(100, 110)).toBe(false);
        expect(shouldApplyRemoteCurrentTime(110, 110)).toBe(true);
        expect(shouldApplyRemoteCurrentTime(100, 110)).toBe(true);
    });

    it('rejects a second-seek stale echo at the previous confirmed position', () => {
        markUserSeekTarget(120, 110);
        expect(shouldApplyRemoteCurrentTime(110, 120)).toBe(false);
    });

    it('resyncs remote UI when TV keeps playing from the seek origin', () => {
        markUserSeekTarget(120, 110);
        expect(shouldApplyRemoteCurrentTime(112, 120)).toBe(true);
    });

    it('still blocks large forward jumps while broadcast suppression is active', () => {
        markServerPlaybackCommand();
        expect(shouldApplyRemoteCurrentTime(120, 100)).toBe(false);
        expect(shouldApplyRemoteCurrentTime(104, 100)).toBe(true);
    });

    it('accepts active-track seeks while broadcast suppression is active', () => {
        markServerPlaybackCommand();
        expect(
            shouldApplyRemoteCurrentTime(45, 0, {
                videoId: 'new-track',
                activeVideoId: 'new-track',
            }),
        ).toBe(true);
    });

    it('rejects stale timeline after track change when room time was reset', () => {
        expect(shouldApplyRemoteCurrentTime(142, 0)).toBe(false);
        expect(shouldApplyRemoteCurrentTime(6, 0)).toBe(true);
    });

    it('rejects currentTimeChanged for a different playingNow video', () => {
        expect(
            shouldApplyRemoteCurrentTime(90, 0, {
                videoId: 'old-video',
                activeVideoId: 'new-video',
            }),
        ).toBe(false);
        expect(
            shouldApplyRemoteCurrentTime(12, 10, {
                videoId: 'same-video',
                activeVideoId: 'same-video',
            }),
        ).toBe(true);
    });
});

describe('shouldSyncEmbedPlaybackState', () => {
    beforeEach(() => {
        vi.stubGlobal('YT', {
            PlayerState: {
                UNSTARTED: -1,
                ENDED: 0,
                PLAYING: 1,
                PAUSED: 2,
                BUFFERING: 3,
                CUED: 5,
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });
});

describe('youtube player state helpers', () => {
    beforeEach(() => {
        vi.stubGlobal('YT', {
            PlayerState: {
                UNSTARTED: -1,
                ENDED: 0,
                PLAYING: 1,
                PAUSED: 2,
                BUFFERING: 3,
                CUED: 5,
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('classifies active, paused, and intent states', () => {
        expect(isYoutubeActivelyPlaying(YT.PlayerState.PLAYING)).toBe(true);
        expect(isYoutubeActivelyPlaying(YT.PlayerState.BUFFERING)).toBe(true);
        expect(isYoutubeActivelyPlaying(YT.PlayerState.PAUSED)).toBe(false);

        expect(isYoutubeExplicitlyPaused(YT.PlayerState.PAUSED)).toBe(true);
        expect(isYoutubeExplicitlyPaused(YT.PlayerState.PLAYING)).toBe(false);

        expect(isYoutubePlaybackIntentState(YT.PlayerState.PLAYING)).toBe(true);
        expect(isYoutubePlaybackIntentState(YT.PlayerState.BUFFERING)).toBe(false);
    });

    it('isPlayerActuallyPlaying reflects playing and buffering', () => {
        const playing = mockPlayer(YT.PlayerState.PLAYING);
        const paused = mockPlayer(YT.PlayerState.PAUSED);

        expect(isPlayerActuallyPlaying(playing)).toBe(true);
        expect(isPlayerActuallyPlaying(paused)).toBe(false);
    });
});

describe('applyPreferredPlaybackQuality', () => {
    it('no-ops when setPlaybackQuality is missing', () => {
        const player = {} as YT.Player;
        expect(() => applyPreferredPlaybackQuality(player)).not.toThrow();
    });

    it('prefers highres when available', () => {
        const player = {
            getAvailableQualityLevels: () => ['medium', 'highres'],
            setPlaybackQuality: vi.fn(),
        } as unknown as YT.Player;

        applyPreferredPlaybackQuality(player);
        expect(player.setPlaybackQuality).toHaveBeenCalledWith('highres');
    });

    it('falls back to hd1080 when highres is unavailable', () => {
        const player = {
            getAvailableQualityLevels: () => ['medium', 'hd1080'],
            setPlaybackQuality: vi.fn(),
        } as unknown as YT.Player;

        applyPreferredPlaybackQuality(player);
        expect(player.setPlaybackQuality).toHaveBeenCalledWith('hd1080');
    });
});
