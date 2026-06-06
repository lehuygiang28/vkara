/** >1080p (1440p/4K when available); YouTube may downgrade based on bandwidth. */
export const PREFERRED_PLAYBACK_QUALITY: YT.SuggestedVideoQuality = 'highres';

/** Request highest quality so YouTube can auto-adjust downward. */
export function applyPreferredPlaybackQuality(player: YT.Player): void {
    if (typeof player.setPlaybackQuality !== 'function') {
        return;
    }

    const levels = player.getAvailableQualityLevels?.() ?? [];
    if (levels.length === 0 || levels.includes(PREFERRED_PLAYBACK_QUALITY)) {
        player.setPlaybackQuality(PREFERRED_PLAYBACK_QUALITY);
        return;
    }

    if (levels.includes('hd1080')) {
        player.setPlaybackQuality('hd1080');
        return;
    }

    player.setPlaybackQuality(PREFERRED_PLAYBACK_QUALITY);
}

/** Embed is playing or loading — not a settled pause. */
export function isYoutubeActivelyPlaying(state: number): boolean {
    return state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING;
}

export function isYoutubeExplicitlyPaused(state: number): boolean {
    return state === YT.PlayerState.PAUSED;
}

/** Only PLAYING / PAUSED reflect settled user or remote intent (not BUFFERING / CUED). */
export function isYoutubePlaybackIntentState(state: number): boolean {
    return state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED;
}

const STALE_PLAYBACK_FORWARD_JUMP_SEC = 5;
const STALE_TRACK_TIMELINE_SEC = 60;
const SEEK_TARGET_MATCH_TOLERANCE_SEC = 1;

type PendingUserSeek = {
    target: number;
    from: number;
};

let seekGeneration = 0;
let pendingUserSeek: PendingUserSeek | null = null;
let suppressPlaybackBroadcast = false;

function clearPendingUserSeek(): void {
    pendingUserSeek = null;
}

export function hasPendingUserSeek(): boolean {
    return pendingUserSeek !== null;
}

/** Block TV position sync while a local play/pause/seek has not been acknowledged yet. */
export function markServerPlaybackCommand(): void {
    suppressPlaybackBroadcast = true;
}

export function clearPlaybackBroadcastSuppression(): void {
    suppressPlaybackBroadcast = false;
}

export function shouldSuppressPlaybackBroadcast(): boolean {
    return suppressPlaybackBroadcast || pendingUserSeek !== null;
}

function matchesPendingSeekTarget(remoteSeconds: number): boolean {
    if (pendingUserSeek === null) {
        return false;
    }
    return Math.abs(remoteSeconds - pendingUserSeek.target) <= SEEK_TARGET_MATCH_TOLERANCE_SEC;
}

/** User-initiated seek/replay: track expected target/from without time windows. */
export function markUserSeekTarget(seconds: number, fromSeconds: number): number {
    seekGeneration += 1;
    suppressPlaybackBroadcast = true;
    pendingUserSeek = {
        target: Math.max(0, Math.floor(seconds)),
        from: Math.max(0, Math.floor(fromSeconds)),
    };
    return seekGeneration;
}

/** After next/playNow/playNow server update: block stale timeline until the new track anchors. */
export function markPlaybackTrackChange(): void {
    clearPendingUserSeek();
    markServerPlaybackCommand();
}

export type RemoteCurrentTimeContext = {
    videoId?: string | null;
    activeVideoId?: string | null;
};

export function getCurrentSeekGeneration(): number {
    return seekGeneration;
}

/** Whether a remote `currentTimeChanged` should update room state. */
export function shouldApplyRemoteCurrentTime(
    remoteTime: number,
    roomTime: number,
    context?: RemoteCurrentTimeContext,
): boolean {
    const remote = Math.max(0, Math.floor(remoteTime));
    const room = Math.max(0, Math.floor(roomTime));

    if (
        context?.videoId != null &&
        context.activeVideoId != null &&
        context.videoId !== context.activeVideoId
    ) {
        return false;
    }

    if (pendingUserSeek !== null) {
        if (matchesPendingSeekTarget(remote)) {
            clearPendingUserSeek();
            clearPlaybackBroadcastSuppression();
            return true;
        }

        if (remote === pendingUserSeek.from) {
            return false;
        }

        if (
            remote > pendingUserSeek.from &&
            remote <= pendingUserSeek.target + SEEK_TARGET_MATCH_TOLERANCE_SEC
        ) {
            return true;
        }

        if (remote < room && remote > pendingUserSeek.from) {
            return true;
        }

        return false;
    }

    // Stale TV position from the previous track after next/playNow reset room time to 0.
    if (room <= SEEK_TARGET_MATCH_TOLERANCE_SEC && remote >= STALE_TRACK_TIMELINE_SEC) {
        return false;
    }

    const isForActiveVideo =
        context?.videoId != null &&
        context?.activeVideoId != null &&
        context.videoId === context.activeVideoId;

    // Suppression blocks stale timeline echoes without a videoId tag. Anchors and seeks for the
    // active track must still apply immediately after auto-next.
    if (
        !isForActiveVideo &&
        shouldSuppressPlaybackBroadcast() &&
        remote > room + STALE_PLAYBACK_FORWARD_JUMP_SEC
    ) {
        return false;
    }

    return true;
}

/** Seek the embed immediately when this client initiated the seek. */
export function applySeekToPlayer(player: YT.Player, targetSeconds: number): void {
    player.seekTo(Math.max(0, Math.floor(targetSeconds)), true);
}

export function resetPlaybackSyncForTests(): void {
    seekGeneration = 0;
    clearPendingUserSeek();
    clearPlaybackBroadcastSuppression();
}

/**
 * Load a new track on the existing embed without remounting the iframe.
 * react-youtube resets (destroy + recreate) when `videoId` prop changes — that
 * leaves the store pointing at a destroyed player while UI state says "playing".
 */
export function loadTrackOnPlayer(player: YT.Player, videoId: string, shouldPlay: boolean): void {
    markPlaybackTrackChange();
    if (shouldPlay) {
        player.loadVideoById(videoId);
        return;
    }
    player.cueVideoById(videoId);
}

/** Align the YouTube iframe with room `isPlaying` (marks server echo to avoid WS feedback). */
export function applyRoomPlaybackToPlayer(player: YT.Player, shouldPlay: boolean): void {
    const playerState = player.getPlayerState();

    if (shouldPlay) {
        if (playerState === undefined || !isYoutubeActivelyPlaying(playerState)) {
            markServerPlaybackCommand();
            player.playVideo();
        }
        return;
    }

    if (playerState === undefined || !isYoutubeExplicitlyPaused(playerState)) {
        markServerPlaybackCommand();
        player.pauseVideo();
    }
}

/** Read whether the embed is actively playing (includes buffering). */
export function isPlayerActuallyPlaying(player: YT.Player): boolean {
    const state = player.getPlayerState();
    return state !== undefined && isYoutubeActivelyPlaying(state);
}
