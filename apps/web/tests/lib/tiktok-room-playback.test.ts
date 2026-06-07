import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => [...map.keys()][index] ?? null,
        removeItem: (key: string) => {
            map.delete(key);
        },
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    });
});

import {
    broadcastTikTokPauseToRoom,
    clearTikTokBackgroundResumeIntent,
    getTikTokBackgroundResumeVideoIdForTests,
    rejectTikTokPlayWhileHidden,
    resumeTikTokAfterBackgroundIfNeeded,
} from '@/lib/tiktok-room-playback';
import {
    handleTikTokPlayerMessage,
    registerTikTokIframe,
    resetTikTokPlaybackStateForTests,
} from '@/lib/tiktok-playback-sync';
import { useYouTubeStore } from '@/store/youtubeStore';
import { createTestPersistedRoom } from '@vkara/room/test-fixtures';

const samplePlayingNow = {
    id: 'vid-1',
    title: 'Mix',
    duration: 180,
    duration_formatted: '03:00',
    type: 'video' as const,
    uploadedAt: '',
    url: 'https://www.tiktok.com/@u/video/vid-1',
    views: 0,
    channels: [],
    thumbnails: [],
    source: 'tiktok' as const,
};

describe('rejectTikTokPlayWhileHidden', () => {
    afterEach(() => {
        resetTikTokPlaybackStateForTests();
        clearTikTokBackgroundResumeIntent();
        useYouTubeStore.setState({ room: null });
    });

    it('returns false when the player page is visible', () => {
        vi.stubGlobal('document', { visibilityState: 'visible' });
        const send = vi.fn();

        useYouTubeStore.setState({
            room: createTestPersistedRoom({
                isPlaying: true,
                currentTime: 12,
                playingNow: samplePlayingNow,
            }),
        });

        expect(
            rejectTikTokPlayWhileHidden({
                videoId: 'vid-1',
                ensureConnectedAndSend: send,
            }),
        ).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });

    it('broadcasts pause when play was requested while the tab is hidden', () => {
        vi.stubGlobal('document', { visibilityState: 'hidden' });
        const send = vi.fn();

        handleTikTokPlayerMessage({
            type: 'onCurrentTime',
            value: { currentTime: 30, duration: 180 },
            'x-tiktok-player': true,
        });

        useYouTubeStore.setState({
            room: createTestPersistedRoom({
                isPlaying: true,
                currentTime: 12,
                playingNow: samplePlayingNow,
            }),
        });

        expect(
            rejectTikTokPlayWhileHidden({
                videoId: 'vid-1',
                ensureConnectedAndSend: send,
            }),
        ).toBe(true);

        expect(useYouTubeStore.getState().room?.isPlaying).toBe(false);
        expect(useYouTubeStore.getState().room?.currentTime).toBe(30);
        expect(send).toHaveBeenCalledTimes(2);
        expect(send).toHaveBeenNthCalledWith(1, {
            type: 'syncPlaybackPosition',
            time: 30,
            videoId: 'vid-1',
            force: true,
        });
        expect(send).toHaveBeenNthCalledWith(2, { type: 'pause' });
    });
});

describe('broadcastTikTokPauseToRoom', () => {
    afterEach(() => {
        clearTikTokBackgroundResumeIntent();
        useYouTubeStore.setState({ room: null });
    });

    it('updates room state and sends sync + pause', () => {
        const send = vi.fn();
        useYouTubeStore.setState({
            room: createTestPersistedRoom({
                isPlaying: true,
                currentTime: 0,
                playingNow: samplePlayingNow,
            }),
        });

        const seconds = broadcastTikTokPauseToRoom({
            videoId: 'vid-1',
            ensureConnectedAndSend: send,
            anchorSeconds: 42,
        });

        expect(seconds).toBe(42);
        expect(useYouTubeStore.getState().room?.isPlaying).toBe(false);
        expect(useYouTubeStore.getState().room?.currentTime).toBe(42);
    });

    it('marks background resume when resumeWhenVisible is set', () => {
        const send = vi.fn();
        useYouTubeStore.setState({
            room: createTestPersistedRoom({
                isPlaying: true,
                currentTime: 0,
                playingNow: samplePlayingNow,
            }),
        });

        broadcastTikTokPauseToRoom({
            videoId: 'vid-1',
            ensureConnectedAndSend: send,
            anchorSeconds: 10,
            resumeWhenVisible: true,
        });

        expect(getTikTokBackgroundResumeVideoIdForTests()).toBe('vid-1');
    });
});

describe('resumeTikTokAfterBackgroundIfNeeded', () => {
    afterEach(() => {
        resetTikTokPlaybackStateForTests();
        clearTikTokBackgroundResumeIntent();
        useYouTubeStore.setState({ room: null });
    });

    it('resumes play when the tab is visible and background pause was remembered', () => {
        vi.stubGlobal('document', { visibilityState: 'visible' });
        vi.stubGlobal('window', {
            setTimeout: (fn: () => void) => {
                fn();
                return 0;
            },
        });
        const postMessage = vi.fn();
        registerTikTokIframe({
            contentWindow: { postMessage },
        } as unknown as HTMLIFrameElement);
        handleTikTokPlayerMessage({ type: 'onPlayerReady', 'x-tiktok-player': true });

        const send = vi.fn();
        useYouTubeStore.setState({
            room: createTestPersistedRoom({
                isPlaying: false,
                currentTime: 10,
                playingNow: samplePlayingNow,
            }),
        });

        broadcastTikTokPauseToRoom({
            videoId: 'vid-1',
            ensureConnectedAndSend: send,
            anchorSeconds: 10,
            resumeWhenVisible: true,
        });
        send.mockClear();
        postMessage.mockClear();

        expect(
            resumeTikTokAfterBackgroundIfNeeded({
                videoId: 'vid-1',
                ensureConnectedAndSend: send,
            }),
        ).toBe(true);

        expect(getTikTokBackgroundResumeVideoIdForTests()).toBeNull();
        expect(useYouTubeStore.getState().room?.isPlaying).toBe(true);
        expect(send).toHaveBeenCalledWith({ type: 'play' });
        expect(postMessage).toHaveBeenCalledWith({ type: 'play', 'x-tiktok-player': true }, '*');
    });

    it('does not resume after a manual pause (no background flag)', () => {
        vi.stubGlobal('document', { visibilityState: 'visible' });
        const send = vi.fn();

        expect(
            resumeTikTokAfterBackgroundIfNeeded({
                videoId: 'vid-1',
                ensureConnectedAndSend: send,
            }),
        ).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });
});
