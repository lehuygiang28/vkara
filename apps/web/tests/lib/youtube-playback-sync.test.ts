import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyPreferredPlaybackQuality,
    applyRoomPlaybackToPlayer,
    isPlayerActuallyPlaying,
    isServerPlaybackEcho,
    isYoutubeActivelyPlaying,
    isYoutubeExplicitlyPaused,
    isYoutubePlaybackIntentState,
    markServerPlaybackCommand,
} from '@/lib/youtube-playback-sync';

function mockPlayer(state: number): YT.Player {
    return {
        getPlayerState: () => state,
        playVideo: vi.fn(),
        pauseVideo: vi.fn(),
    } as unknown as YT.Player;
}

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

describe('markServerPlaybackEcho', () => {
    it('suppresses echo feedback for a short window', () => {
        vi.useFakeTimers();
        markServerPlaybackCommand();
        expect(isServerPlaybackEcho()).toBe(true);
        vi.advanceTimersByTime(801);
        expect(isServerPlaybackEcho()).toBe(false);
        vi.useRealTimers();
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
