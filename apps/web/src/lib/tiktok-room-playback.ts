import type { RawClientMessage } from '@vkara/room';

import { applyRoomPlaybackToTikTok, captureTikTokPausePosition } from '@/lib/tiktok-playback-sync';
import { markServerPlaybackCommand } from '@/lib/youtube-playback-sync';
import { useYouTubeStore } from '@/store/youtubeStore';

export function isPlayerPageHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

/** Set when tab-hidden auto-pause should resume once the player page is visible again. */
let backgroundResumeVideoId: string | null = null;

export function clearTikTokBackgroundResumeIntent(): void {
    backgroundResumeVideoId = null;
}

export function getTikTokBackgroundResumeVideoIdForTests(): string | null {
    return backgroundResumeVideoId;
}

function markBackgroundResume(videoId: string): void {
    backgroundResumeVideoId = videoId;
}

/** Snap embed time, pause room locally, and broadcast position + pause (once). */
export function broadcastTikTokPauseToRoom({
    videoId,
    ensureConnectedAndSend,
    anchorSeconds,
    resumeWhenVisible = false,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
    anchorSeconds?: number;
    /** Remember to auto-play when the TV tab becomes visible again (tab-hidden pause only). */
    resumeWhenVisible?: boolean;
}): number {
    const seconds = anchorSeconds ?? captureTikTokPausePosition();
    markServerPlaybackCommand();
    useYouTubeStore.setState((state) => ({
        room: state.room
            ? {
                  ...state.room,
                  isPlaying: false,
                  currentTime: seconds,
              }
            : null,
    }));
    ensureConnectedAndSend({
        type: 'syncPlaybackPosition',
        time: seconds,
        videoId,
        force: true,
    });
    ensureConnectedAndSend({ type: 'pause' });
    if (resumeWhenVisible) {
        markBackgroundResume(videoId);
    }
    return seconds;
}

/** Remote (or host) requested play while the TV tab is hidden — TikTok cannot start. */
export function rejectTikTokPlayWhileHidden({
    videoId,
    ensureConnectedAndSend,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
}): boolean {
    if (!isPlayerPageHidden()) {
        return false;
    }
    const { room } = useYouTubeStore.getState();
    if (!room?.isPlaying) {
        return false;
    }
    broadcastTikTokPauseToRoom({ videoId, ensureConnectedAndSend });
    return true;
}

/** TV host: resume TikTok after a tab-hidden pause once the page is visible again. */
export function resumeTikTokAfterBackgroundIfNeeded({
    videoId,
    ensureConnectedAndSend,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
}): boolean {
    if (isPlayerPageHidden()) {
        return false;
    }
    if (backgroundResumeVideoId !== videoId) {
        return false;
    }

    clearTikTokBackgroundResumeIntent();
    markServerPlaybackCommand();
    useYouTubeStore.setState((state) => ({
        room: state.room ? { ...state.room, isPlaying: true } : null,
    }));
    applyRoomPlaybackToTikTok(true);
    ensureConnectedAndSend({ type: 'play' });
    return true;
}

export function subscribeTikTokVisibilityPlayback({
    videoId,
    ensureConnectedAndSend,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
}): () => void {
    if (typeof document === 'undefined') {
        return () => {};
    }

    const onVisible = () => {
        if (document.visibilityState !== 'visible') {
            return;
        }
        resumeTikTokAfterBackgroundIfNeeded({ videoId, ensureConnectedAndSend });
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);

    return () => {
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('pageshow', onVisible);
    };
}
