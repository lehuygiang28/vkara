/** Minimum seconds between WS broadcasts of the same room's playback position. */
export const PLAYBACK_TIME_BROADCAST_MIN_INTERVAL_MS = 15_000;

/** Always broadcast when the position jumps by at least this many seconds. */
export const PLAYBACK_TIME_BROADCAST_MIN_DELTA_SEC = 10;

export type PlaybackTimeSyncState = {
    at: number;
    seconds: number;
};

/**
 * Whether a playback position should be broadcast over WebSocket.
 * User-initiated large seeks should pass; high-frequency small updates should not.
 */
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
