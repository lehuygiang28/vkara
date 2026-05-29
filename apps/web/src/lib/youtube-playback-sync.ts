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

const SERVER_PLAYBACK_ECHO_MS = 800;
let serverPlaybackCommandUntil = 0;

/** Call before applying a remote play/pause to the iframe (avoids echoing back to the server). */
export function markServerPlaybackCommand(): void {
    serverPlaybackCommandUntil = Date.now() + SERVER_PLAYBACK_ECHO_MS;
}

export function isServerPlaybackEcho(): boolean {
    return Date.now() < serverPlaybackCommandUntil;
}
