/** Minimum seconds between WS broadcasts of the same room's playback position. */
export const PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS = 15_000;

/** Always broadcast when the position jumps by at least this many seconds. */
export const PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC = 10;

/** Skip seekTo on the TV player when echo drift is within this tolerance. */
export const PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC = 2;

export type PlaybackTimeSyncState = {
    at: number;
    seconds: number;
};

export type PlaybackDisplayAnchor = {
    baseSeconds: number;
    syncedAtMs: number;
    isPlaying: boolean;
    videoId: string | null;
};

/**
 * Smooth UI position from last server anchor + local elapsed time while playing.
 */
export function computeExtrapolatedPlaybackSeconds(
    anchor: PlaybackDisplayAnchor,
    nowMs = Date.now(),
): number {
    if (!anchor.isPlaying) {
        return Math.max(0, Math.floor(anchor.baseSeconds));
    }
    const elapsedSec = Math.max(0, (nowMs - anchor.syncedAtMs) / 1000);
    return Math.max(0, Math.floor(anchor.baseSeconds + elapsedSec));
}

/**
 * Whether a playback position should be broadcast over WebSocket.
 * User-initiated large seeks should pass; high-frequency small updates should not.
 */
/**
 * Periodic position sync must not move the room backward (late join / reconnect at t≈0).
 * User seeks use the `seek` message instead.
 */
export function acceptSyncPlaybackPositionTime(
    serverSeconds: number,
    proposedSeconds: number,
): number | null {
    const server = Math.max(0, Math.floor(serverSeconds));
    const proposed = Math.max(0, Math.floor(proposedSeconds));
    if (proposed < server) {
        return null;
    }
    return proposed;
}

export function needsPlaybackSeekCorrection(
    playerSeconds: number,
    targetSeconds: number,
): boolean {
    const player = Math.floor(playerSeconds);
    const target = Math.floor(targetSeconds);
    return Math.abs(player - target) > PLAYBACK_PLAYER_DRIFT_TOLERANCE_SEC;
}

export function shouldBroadcastPlaybackTime(
    last: PlaybackTimeSyncState | undefined,
    nextSeconds: number,
    previousSeconds: number,
    now = Date.now(),
): boolean {
    const delta = Math.abs(nextSeconds - previousSeconds);
    if (delta >= PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC) {
        return true;
    }
    if (!last) {
        return true;
    }
    if (Math.abs(nextSeconds - last.seconds) >= PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC) {
        return true;
    }
    return now - last.at >= PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS;
}
