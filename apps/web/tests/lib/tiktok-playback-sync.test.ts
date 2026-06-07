import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    buildTikTokPlayerSrc,
    captureTikTokPausePosition,
    getTikTokPhotoImageIndex,
    getTikTokPhotoMaxImageIndex,
    getTikTokSeekBaseSeconds,
    handleTikTokPlayerMessage,
    navigateTikTokPhotoByDelta,
    navigateTikTokPhotoTo,
    registerTikTokIframe,
    resetTikTokPlaybackStateForTests,
    setTikTokEmbedPostType,
    setTikTokPlaybackEndHandler,
} from '@/lib/tiktok-playback-sync';

describe('buildTikTokPlayerSrc', () => {
    it('sets closed_caption from options', () => {
        const off = buildTikTokPlayerSrc('123', { closedCaption: false });
        const on = buildTikTokPlayerSrc('123', { closedCaption: true });

        expect(off).toContain('closed_caption=0');
        expect(on).toContain('closed_caption=1');
    });
});

describe('captureTikTokPausePosition', () => {
    afterEach(() => {
        resetTikTokPlaybackStateForTests();
        vi.useRealTimers();
    });

    it('freezes extrapolation when embed reports pause', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 1,
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 30, duration: 120 },
            'x-tiktok-player': true,
        });

        vi.setSystemTime(5000);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 2,
            'x-tiktok-player': true,
        });

        expect(captureTikTokPausePosition()).toBe(35);
        expect(getTikTokSeekBaseSeconds(false)).toBe(35);
        expect(getTikTokSeekBaseSeconds(true)).toBe(35);
    });

    it('ignores stale onCurrentTime ticks while playing', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 1,
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 100, duration: 300 },
            'x-tiktok-player': true,
        });

        vi.setSystemTime(20_000);

        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 100, duration: 300 },
            'x-tiktok-player': true,
        });

        expect(getTikTokSeekBaseSeconds(true)).toBe(120);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 2,
            'x-tiktok-player': true,
        });

        expect(captureTikTokPausePosition()).toBe(120);
    });

    it('refines pause snapshot from post-pause onCurrentTime', () => {
        vi.useFakeTimers();
        vi.setSystemTime(0);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 1,
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 100, duration: 300 },
            'x-tiktok-player': true,
        });
        vi.setSystemTime(18_000);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 2,
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 118.4, duration: 300 },
            'x-tiktok-player': true,
        });

        expect(captureTikTokPausePosition()).toBe(118);
    });
});

describe('tiktok-playback-sync playback end', () => {
    afterEach(() => {
        resetTikTokPlaybackStateForTests();
    });

    it('fires end handler on onStateChange ended (0) for videos', () => {
        const onEnd = vi.fn();
        setTikTokPlaybackEndHandler(onEnd);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 0,
            'x-tiktok-player': true,
        });

        expect(onEnd).toHaveBeenCalledTimes(1);
    });

    it('does not auto-end photo posts on onStateChange or music duration', () => {
        const onEnd = vi.fn();
        setTikTokPlaybackEndHandler(onEnd);
        setTikTokEmbedPostType(true);

        handleTikTokPlayerMessage({
            type: 'onStateChange',
            value: 0,
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 10, duration: 10 },
            'x-tiktok-player': true,
        });

        expect(onEnd).not.toHaveBeenCalled();
    });

    it('fires end when player-reported currentTime reaches duration for videos', () => {
        const onEnd = vi.fn();
        setTikTokPlaybackEndHandler(onEnd);

        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 0, duration: 12 },
            'x-tiktok-player': true,
        });
        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 11.8, duration: 12 },
            'x-tiktok-player': true,
        });

        expect(onEnd).toHaveBeenCalledTimes(1);
    });
});

describe('tiktok-playback-sync photo navigateTo', () => {
    afterEach(() => {
        resetTikTokPlaybackStateForTests();
    });

    it('tracks onImageChange index from the embed player', () => {
        handleTikTokPlayerMessage({
            type: 'onImageChange',
            value: 2,
            'x-tiktok-player': true,
        });

        expect(getTikTokPhotoImageIndex()).toBe(2);
        expect(getTikTokPhotoMaxImageIndex()).toBe(2);
    });

    it('posts navigateTo to the iframe', () => {
        const postMessage = vi.fn();
        registerTikTokIframe({
            contentWindow: { postMessage },
        } as unknown as HTMLIFrameElement);

        handleTikTokPlayerMessage({
            type: 'onPlayerReady',
            'x-tiktok-player': true,
        });

        handleTikTokPlayerMessage({
            type: 'onImageChange',
            value: 1,
            'x-tiktok-player': true,
        });

        navigateTikTokPhotoByDelta(1);

        expect(postMessage).toHaveBeenCalledWith(
            { type: 'navigateTo', value: 2, 'x-tiktok-player': true },
            '*',
        );
    });

    it('does not navigate before index 0', () => {
        const postMessage = vi.fn();
        registerTikTokIframe({
            contentWindow: { postMessage },
        } as unknown as HTMLIFrameElement);
        handleTikTokPlayerMessage({ type: 'onPlayerReady', 'x-tiktok-player': true });

        navigateTikTokPhotoByDelta(-1);

        expect(postMessage).not.toHaveBeenCalled();
    });

    it('queues navigateTo until the player is ready', () => {
        const postMessage = vi.fn();
        registerTikTokIframe({
            contentWindow: { postMessage },
        } as unknown as HTMLIFrameElement);

        navigateTikTokPhotoTo(3);
        expect(postMessage).not.toHaveBeenCalled();

        handleTikTokPlayerMessage({ type: 'onPlayerReady', 'x-tiktok-player': true });

        expect(postMessage).toHaveBeenCalledWith(
            { type: 'navigateTo', value: 3, 'x-tiktok-player': true },
            '*',
        );
    });
});
