import type { RawClientMessage } from '@vkara/room';

import {
    applyRoomPlaybackToTikTok,
    applySeekToTikTok,
    captureTikTokPausePosition,
    getTikTokEmbedIsPaused,
    isTikTokPlayerReady,
} from '@/lib/tiktok-playback-sync';
import { markServerPlaybackCommand } from '@/lib/youtube-playback-sync';
import { useYouTubeStore } from '@/store/youtubeStore';

/** Wait for iframe to settle after rapid tab hide/show before play+seek. */
const VISIBILITY_RESUME_DELAY_MS = 150;

export function isPlayerPageHidden(): boolean {
    return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

/** Set when tab-hidden auto-pause should resume once the player page is visible again. */
let backgroundResumeVideoId: string | null = null;

let pendingVisibilityResumeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingVisibilityResumeVideoId: string | null = null;

export function clearTikTokBackgroundResumeIntent(): void {
    backgroundResumeVideoId = null;
}

export function getTikTokBackgroundResumeVideoIdForTests(): string | null {
    return backgroundResumeVideoId;
}

export function clearPendingTikTokVisibilityResumeForTests(): void {
    if (pendingVisibilityResumeTimer != null) {
        clearTimeout(pendingVisibilityResumeTimer);
        pendingVisibilityResumeTimer = null;
    }
    pendingVisibilityResumeVideoId = null;
}

function markBackgroundResume(videoId: string): void {
    backgroundResumeVideoId = videoId;
}

function clearPendingVisibilityResumeTimer(): void {
    if (pendingVisibilityResumeTimer != null) {
        clearTimeout(pendingVisibilityResumeTimer);
        pendingVisibilityResumeTimer = null;
    }
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
    const room = useYouTubeStore.getState().room;
    const seconds = anchorSeconds ?? captureTikTokPausePosition();

    if (resumeWhenVisible) {
        markBackgroundResume(videoId);
    }

    if (!room?.isPlaying) {
        return seconds;
    }

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
    broadcastTikTokPauseToRoom({
        videoId,
        ensureConnectedAndSend,
        resumeWhenVisible: true,
    });
    return true;
}

function performTikTokVisibilityResume({
    videoId,
    ensureConnectedAndSend,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
}): void {
    if (isPlayerPageHidden()) {
        return;
    }

    const room = useYouTubeStore.getState().room;
    if (!room || room.playingNow?.id !== videoId) {
        return;
    }

    const hasBackgroundIntent = backgroundResumeVideoId === videoId;
    const embedDrifted = room.isPlaying && getTikTokEmbedIsPaused();

    if (!hasBackgroundIntent && !embedDrifted) {
        return;
    }

    clearTikTokBackgroundResumeIntent();
    markServerPlaybackCommand();

    const resumeAt = Math.max(0, room.currentTime);

    if (!room.isPlaying) {
        useYouTubeStore.setState((state) => ({
            room: state.room ? { ...state.room, isPlaying: true, currentTime: resumeAt } : null,
        }));
    }

    if (isTikTokPlayerReady()) {
        applySeekToTikTok(resumeAt);
        applyRoomPlaybackToTikTok(true);
    }

    ensureConnectedAndSend({ type: 'play' });
}

function scheduleTikTokVisibilityResume({
    videoId,
    ensureConnectedAndSend,
}: {
    videoId: string;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
}): void {
    if (isPlayerPageHidden()) {
        clearPendingVisibilityResumeTimer();
        pendingVisibilityResumeVideoId = null;
        return;
    }

    pendingVisibilityResumeVideoId = videoId;
    clearPendingVisibilityResumeTimer();
    pendingVisibilityResumeTimer = setTimeout(() => {
        pendingVisibilityResumeTimer = null;
        const targetVideoId = pendingVisibilityResumeVideoId;
        pendingVisibilityResumeVideoId = null;
        if (!targetVideoId) {
            return;
        }
        performTikTokVisibilityResume({
            videoId: targetVideoId,
            ensureConnectedAndSend,
        });
    }, VISIBILITY_RESUME_DELAY_MS);
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

    const room = useYouTubeStore.getState().room;
    const shouldSchedule =
        backgroundResumeVideoId === videoId ||
        (room?.playingNow?.id === videoId && room.isPlaying && getTikTokEmbedIsPaused());

    if (!shouldSchedule) {
        return false;
    }

    scheduleTikTokVisibilityResume({ videoId, ensureConnectedAndSend });
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

    const onVisibilityChange = () => {
        if (document.visibilityState !== 'visible') {
            clearPendingVisibilityResumeTimer();
            pendingVisibilityResumeVideoId = null;
            return;
        }
        resumeTikTokAfterBackgroundIfNeeded({ videoId, ensureConnectedAndSend });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onVisibilityChange);

    return () => {
        clearPendingVisibilityResumeTimer();
        pendingVisibilityResumeVideoId = null;
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pageshow', onVisibilityChange);
    };
}
