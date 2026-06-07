const PLAYER_OPTS = [
    'controls=0',
    'progress_bar=0',
    'play_button=0',
    'volume_control=0',
    'fullscreen_button=0',
    'timestamp=0',
    'loop=0',
].join('&');

/** Seconds before the end of player-reported duration to treat playback as complete. */
const END_EPSILON_SEC = 0.35;

export function buildTikTokPlayerSrc(
    videoId: string,
    options?: { autoplay?: boolean; closedCaption?: boolean },
): string {
    const params = new URLSearchParams(PLAYER_OPTS);
    if (options?.autoplay) {
        params.set('autoplay', '1');
    }
    params.set('closed_caption', options?.closedCaption ? '1' : '0');
    return `https://www.tiktok.com/player/v1/${videoId}?${params.toString()}`;
}

type TikTokPlayerMessage = {
    type: string;
    value?: unknown;
    'x-tiktok-player'?: boolean;
};

let iframe: HTMLIFrameElement | null = null;
let ready = false;
let currentTimeSec = 0;
let currentTimeSyncedAtMs = 0;
let durationSec = 0;
let muted = false;
/** Last volume the host asked for (TikTok only supports mute/unmute, not 0–100). */
let desiredVolume = 100;
let isPhotoPost = false;
let playbackEndNotified = false;
let onPlaybackEndHandler: (() => void) | null = null;
let photoImageIndex = 0;
let photoMaxImageIndex = 0;
let onPhotoImageChangeHandler: ((index: number) => void) | null = null;

type PendingCommands = {
    playing?: boolean;
    seekSeconds?: number;
    volume?: number;
    navigateIndex?: number;
};

let pending: PendingCommands = {};

/** Embed onStateChange: 1 playing, 2 paused (TikTok Embed Player docs). */
let embedPlayerState = -1;
/** Extrapolated position captured at the playing→paused transition. */
let pauseSnapshotSec: number | null = null;
let pausePlayingChangeTimer: ReturnType<typeof setTimeout> | null = null;

/** Wait briefly so a post-pause onCurrentTime can refine the snapshot. */
const PAUSE_SYNC_DEFER_MS = 80;
/** Ignore sparse embed ticks that lag behind extrapolated playback. */
const STALE_CURRENT_TIME_TOLERANCE_SEC = 1.5;

function clearPausePlayingChangeTimer(): void {
    if (pausePlayingChangeTimer != null) {
        clearTimeout(pausePlayingChangeTimer);
        pausePlayingChangeTimer = null;
    }
}

function applyCurrentTimeUpdate(incoming: number): void {
    if (embedPlayerState === 1) {
        const projected = getTikTokSeekBaseSeconds(true);
        if (incoming + STALE_CURRENT_TIME_TOLERANCE_SEC < projected) {
            return;
        }
    }
    if (embedPlayerState === 2 && pauseSnapshotSec != null && incoming > pauseSnapshotSec) {
        pauseSnapshotSec = incoming;
    }
    currentTimeSec = incoming;
    currentTimeSyncedAtMs = Date.now();
}

/** Defer room pause sync so onCurrentTime can arrive after onStateChange paused. */
export function scheduleTikTokEmbedPauseSync(onPaused: () => void): void {
    clearPausePlayingChangeTimer();
    pausePlayingChangeTimer = setTimeout(() => {
        pausePlayingChangeTimer = null;
        onPaused();
    }, PAUSE_SYNC_DEFER_MS);
}

function post(type: string, value?: number) {
    if (!iframe?.contentWindow) return;
    const msg: TikTokPlayerMessage = { type, 'x-tiktok-player': true };
    if (value !== undefined) {
        msg.value = value;
    }
    iframe.contentWindow.postMessage(msg, '*');
}

function notifyPlaybackEnd(): void {
    if (playbackEndNotified || isPhotoPost) {
        return;
    }
    playbackEndNotified = true;
    onPlaybackEndHandler?.();
}

function checkDurationBasedEnd(): void {
    if (isPhotoPost || durationSec <= END_EPSILON_SEC) {
        return;
    }
    if (currentTimeSec >= durationSec - END_EPSILON_SEC) {
        notifyPlaybackEnd();
    }
}

function applyVolumeNow(volume: number): void {
    const clamped = Math.min(100, Math.max(0, volume));
    desiredVolume = clamped;
    if (clamped === 0) {
        post('mute');
        muted = true;
        return;
    }
    // Player often starts muted (autoplay policy); always unMute when host volume > 0.
    post('unMute');
    muted = false;
}

/** Browsers may keep embed muted until after play(); retry unMute once playback starts. */
function ensureAudibleAfterPlay(): void {
    if (desiredVolume <= 0) return;
    post('unMute');
    muted = false;
    window.setTimeout(() => {
        if (ready && desiredVolume > 0) {
            post('unMute');
            muted = false;
        }
    }, 150);
}

function flushPending(): void {
    if (!ready) return;

    if (pending.volume !== undefined) {
        const volume = pending.volume;
        delete pending.volume;
        applyVolumeNow(volume);
    }

    if (pending.seekSeconds !== undefined) {
        const seconds = pending.seekSeconds;
        delete pending.seekSeconds;
        post('seekTo', seconds);
        currentTimeSec = seconds;
        currentTimeSyncedAtMs = Date.now();
    }

    if (pending.navigateIndex !== undefined) {
        const index = pending.navigateIndex;
        delete pending.navigateIndex;
        post('navigateTo', index);
    }

    if (pending.playing !== undefined) {
        const playing = pending.playing;
        delete pending.playing;
        if (playing) {
            post('play');
            ensureAudibleAfterPlay();
        } else {
            post('pause');
        }
    }
}

export function registerTikTokIframe(element: HTMLIFrameElement | null): void {
    iframe = element;
    if (!element) {
        ready = false;
    }
}

export function setTikTokEmbedPostType(photo: boolean): void {
    isPhotoPost = photo;
}

export function setTikTokPlaybackEndHandler(handler: (() => void) | null): void {
    onPlaybackEndHandler = handler;
}

export function setTikTokPhotoImageChangeHandler(handler: ((index: number) => void) | null): void {
    onPhotoImageChangeHandler = handler;
}

export function getTikTokPhotoImageIndex(): number {
    return photoImageIndex;
}

export function getTikTokPhotoMaxImageIndex(): number {
    return photoMaxImageIndex;
}

/** Image carousel: host → player `navigateTo` (TikTok Embed Player docs). */
export function navigateTikTokPhotoTo(index: number): void {
    const target = Math.max(0, Math.floor(index));
    if (!ready) {
        pending.navigateIndex = target;
        return;
    }
    post('navigateTo', target);
}

export function navigateTikTokPhotoByDelta(delta: -1 | 1): void {
    const next = photoImageIndex + delta;
    if (next < 0) {
        return;
    }
    navigateTikTokPhotoTo(next);
}

export function isTikTokPlayerReady(): boolean {
    return ready && iframe !== null;
}

export function getTikTokCurrentTime(): number {
    return currentTimeSec;
}

export function getTikTokDuration(): number {
    return durationSec;
}

/** Playback position for seek +/- and room sync (extrapolates while playing). */
export function getTikTokSeekBaseSeconds(isPlaying: boolean): number {
    if (!isPlaying) {
        return Math.max(0, Math.floor(currentTimeSec));
    }
    const elapsedSec = Math.max(0, (Date.now() - currentTimeSyncedAtMs) / 1000);
    const extrapolated = currentTimeSec + elapsedSec;
    if (durationSec > END_EPSILON_SEC) {
        return Math.max(0, Math.floor(Math.min(extrapolated, durationSec)));
    }
    return Math.max(0, Math.floor(extrapolated));
}

/** Freeze extrapolation at the current embed position (call when embed reports pause). */
export function captureTikTokPausePosition(): number {
    const seconds = Math.max(
        0,
        Math.floor(pauseSnapshotSec ?? getTikTokSeekBaseSeconds(true)),
    );
    pauseSnapshotSec = null;
    currentTimeSec = seconds;
    currentTimeSyncedAtMs = Date.now();
    return seconds;
}

export function applyRoomPlaybackToTikTok(playing: boolean): void {
    if (!ready) {
        pending.playing = playing;
        return;
    }
    if (playing) {
        post('play');
        ensureAudibleAfterPlay();
    } else {
        post('pause');
    }
}

export function applySeekToTikTok(seconds: number): void {
    const clamped = Math.max(0, Math.round(seconds * 10) / 10);
    if (!ready) {
        pending.seekSeconds = clamped;
        return;
    }
    post('seekTo', clamped);
    currentTimeSec = clamped;
    currentTimeSyncedAtMs = Date.now();
}

export function applyTikTokVolume(volume: number): void {
    desiredVolume = Math.min(100, Math.max(0, volume));
    if (!ready) {
        pending.volume = volume;
        return;
    }
    applyVolumeNow(volume);
}

export function handleTikTokPlayerMessage(data: TikTokPlayerMessage): void {
    if (!data || data['x-tiktok-player'] !== true) {
        return;
    }

    switch (data.type) {
        case 'onPlayerReady':
            ready = true;
            playbackEndNotified = false;
            flushPending();
            break;
        case 'onCurrentTime': {
            const value = data.value as { currentTime?: number; duration?: number } | undefined;
            if (value?.currentTime != null) {
                applyCurrentTimeUpdate(Number(value.currentTime) || 0);
            }
            if (value?.duration != null) {
                const nextDuration = Number(value.duration) || 0;
                if (nextDuration > durationSec) {
                    durationSec = nextDuration;
                } else if (nextDuration > 0) {
                    durationSec = nextDuration;
                }
            }
            checkDurationBasedEnd();
            break;
        }
        case 'onImageChange': {
            const index = Number(data.value);
            if (!Number.isFinite(index) || index < 0) {
                break;
            }
            photoImageIndex = index;
            photoMaxImageIndex = Math.max(photoMaxImageIndex, index);
            onPhotoImageChangeHandler?.(index);
            break;
        }
        case 'onMute':
            muted = Boolean(data.value);
            if (muted && desiredVolume > 0) {
                post('unMute');
                muted = false;
            }
            break;
        case 'onStateChange':
            if (data.value === 1) {
                embedPlayerState = 1;
                pauseSnapshotSec = null;
                clearPausePlayingChangeTimer();
            }
            if (data.value === 2) {
                if (embedPlayerState === 1) {
                    pauseSnapshotSec = getTikTokSeekBaseSeconds(true);
                }
                embedPlayerState = 2;
            }
            if (data.value === 0 && !isPhotoPost) {
                currentTimeSec = durationSec > 0 ? durationSec : currentTimeSec;
                notifyPlaybackEnd();
            }
            break;
        default:
            break;
    }
}

export function resetTikTokPlaybackState(): void {
    ready = false;
    currentTimeSec = 0;
    currentTimeSyncedAtMs = 0;
    durationSec = 0;
    muted = false;
    playbackEndNotified = false;
    photoImageIndex = 0;
    photoMaxImageIndex = 0;
    pending = {};
    embedPlayerState = -1;
    pauseSnapshotSec = null;
    clearPausePlayingChangeTimer();
}

/** @internal Test-only reset for module-level playback state. */
export function resetTikTokPlaybackStateForTests(): void {
    resetTikTokPlaybackState();
    isPhotoPost = false;
    onPlaybackEndHandler = null;
    onPhotoImageChangeHandler = null;
    iframe = null;
}
