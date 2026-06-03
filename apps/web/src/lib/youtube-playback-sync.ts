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

const SERVER_PLAYBACK_ECHO_MS = 800;
let serverPlaybackCommandUntil = 0;

/** Call before applying a remote play/pause to the iframe (avoids echoing back to the server). */
export function markServerPlaybackCommand(): void {
    serverPlaybackCommandUntil = Date.now() + SERVER_PLAYBACK_ECHO_MS;
}

export function isServerPlaybackEcho(): boolean {
    return Date.now() < serverPlaybackCommandUntil;
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
