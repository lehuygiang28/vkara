import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    applyRoomPlaybackToPlayer,
    isServerPlaybackEcho,
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
