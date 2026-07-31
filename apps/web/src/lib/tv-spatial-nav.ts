import { init, setKeyMap, setFocus } from '@noriginmedia/norigin-spatial-navigation-core';

/** App root — never use ROOT_FOCUS_KEY (`SN:ROOT`). */
export const TV_APP_ROOT_KEY = 'TV_APP_ROOT';

export const TV_FOCUS_KEYS = {
    appRoot: TV_APP_ROOT_KEY,
    playerChrome: 'TV_PLAYER_CHROME',
    controlBar: 'TV_CONTROL_BAR',
    ctrlReplay: 'TV_CTRL_REPLAY',
    ctrlPlayPause: 'TV_CTRL_PLAY_PAUSE',
    ctrlNext: 'TV_CTRL_NEXT',
    ctrlSettings: 'TV_CTRL_SETTINGS',
    idleQr: 'TV_IDLE_QR',
    queuePanel: 'TV_QUEUE_PANEL',
    settingsPanel: 'TV_SETTINGS_PANEL',
    settingsClose: 'TV_SETTINGS_CLOSE',
    settingsQrToggle: 'TV_SETTINGS_QR_TOGGLE',
    settingsLocale: 'TV_SETTINGS_LOCALE',
    settingsLeave: 'TV_SETTINGS_LEAVE',
    settingsCloseRoom: 'TV_SETTINGS_CLOSE_ROOM',
    settingsLock: 'TV_SETTINGS_LOCK',
    settingsParticipants: 'TV_SETTINGS_PARTICIPANTS',
    lobby: 'TV_LOBBY',
    lobbyCreate: 'TV_LOBBY_CREATE',
    lobbySettings: 'TV_LOBBY_SETTINGS',
    lobbyJoin: 'TV_LOBBY_JOIN',
    lobbyPassword: 'TV_LOBBY_PASSWORD',
    lobbyCodeDigit: (index: number) => `TV_LOBBY_CODE_${index}`,
    queueItem: (videoId: string) => `TV_QUEUE_${videoId}`,
    nextUpPanel: 'TV_NEXT_UP_PANEL',
    nextUpPlayNext: 'TV_NEXT_UP_PLAY_NEXT',
    nextUpReplay: 'TV_NEXT_UP_REPLAY',
} as const;

/**
 * Samsung Tizen remote keyCodes
 * @see https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html
 *
 * On Chrome 85-class Tizen engines, `event.key` is often `"Unidentified"` for these —
 * always prefer keyCode when present in this table.
 */
export const TV_REMOTE_KEY_CODES: Readonly<Record<number, string>> = {
    13: 'Enter',
    19: 'MediaPause',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    412: 'MediaRewind',
    413: 'MediaStop',
    415: 'MediaPlay',
    417: 'MediaFastForward',
    427: 'ChannelUp',
    428: 'ChannelDown',
    447: 'AudioVolumeUp',
    448: 'AudioVolumeDown',
    449: 'AudioVolumeMute',
    10009: 'Back',
    10182: 'Exit',
    10232: 'MediaTrackPrevious',
    10233: 'MediaTrackNext',
    10252: 'MediaPlayPause',
};

/** Relative seek step for MediaRewind / MediaFastForward (matches phone PlayerControls). */
export const TV_MEDIA_SEEK_SECONDS = 10;

/** Keys that reveal the TV overlay chrome (YouTube TV style). */
export const TV_REVEAL_KEYS = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Enter',
    ' ',
    'Escape',
    'Backspace',
    'Back',
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    'MediaStop',
    'MediaTrackNext',
    'MediaTrackPrevious',
    'MediaRewind',
    'MediaFastForward',
    'AudioVolumeUp',
    'AudioVolumeDown',
    'AudioVolumeMute',
    'ChannelUp',
    'ChannelDown',
    'BrowserBack',
]);

export const TV_BACK_KEYS = new Set(['Escape', 'Backspace', 'Back', 'BrowserBack']);

export const TV_EXIT_KEYS = new Set(['Exit']);

export const TV_MEDIA_ACTION_KEYS = new Set([
    'MediaPlayPause',
    'MediaPlay',
    'MediaPause',
    'MediaStop',
    'MediaTrackNext',
    'MediaTrackPrevious',
    'MediaRewind',
    'MediaFastForward',
]);

const TV_NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ']);

type TvKeyEventLike = Pick<KeyboardEvent, 'key'> & {
    keyCode?: number;
    which?: number;
};

let spatialNavInitialized = false;

/**
 * Resolve a remote/keyboard event to a canonical key name.
 * Prefers Samsung/Tizen keyCode when known — required when `key` is `"Unidentified"`.
 */
export function resolveTvRemoteKey(event: TvKeyEventLike): string {
    const code = event.keyCode || event.which;
    if (typeof code === 'number' && code > 0) {
        const fromCode = TV_REMOTE_KEY_CODES[code];
        if (fromCode) {
            return fromCode;
        }
    }

    const key = event.key;
    if (key && key !== 'Unidentified') {
        return key;
    }

    return key || '';
}

export function ensureTvSpatialNavInit(): void {
    if (spatialNavInitialized || typeof window === 'undefined') {
        return;
    }

    init({
        debug: false,
        visualDebug: false,
        distanceCalculationMethod: 'center',
        throttle: 100,
    });

    setKeyMap({
        left: ['ArrowLeft', 37],
        right: ['ArrowRight', 39],
        up: ['ArrowUp', 38],
        down: ['ArrowDown', 40],
        enter: ['Enter', 13],
    });

    spatialNavInitialized = true;
}

export function isTvRevealKey(event: TvKeyEventLike | string): boolean {
    const key = typeof event === 'string' ? event : resolveTvRemoteKey(event);
    return TV_REVEAL_KEYS.has(key);
}

export function isTvBackKey(event: TvKeyEventLike | string): boolean {
    const key = typeof event === 'string' ? event : resolveTvRemoteKey(event);
    return TV_BACK_KEYS.has(key);
}

export function isTvExitKey(event: TvKeyEventLike | string): boolean {
    const key = typeof event === 'string' ? event : resolveTvRemoteKey(event);
    return TV_EXIT_KEYS.has(key);
}

export function isTvMediaActionKey(event: TvKeyEventLike | string): boolean {
    const key = typeof event === 'string' ? event : resolveTvRemoteKey(event);
    return TV_MEDIA_ACTION_KEYS.has(key);
}

/** D-pad / OK — used to seed idle focus when spatial tree has no active leaf. */
export function isTvNavigationKey(event: TvKeyEventLike | string): boolean {
    const key = typeof event === 'string' ? event : resolveTvRemoteKey(event);
    return TV_NAVIGATION_KEYS.has(key);
}

/** Exit the Tizen widget when running inside a Samsung app webview. */
export function tryExitTizenApp(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const app = (
            window as unknown as {
                tizen?: {
                    application?: {
                        getCurrentApplication?: () => { exit: () => void };
                    };
                };
            }
        ).tizen?.application?.getCurrentApplication?.();
        if (!app?.exit) {
            return false;
        }
        app.exit();
        return true;
    } catch {
        return false;
    }
}

const DEFAULT_FOCUS_SEED_ATTEMPTS = 20;

/**
 * Focus a spatial leaf after lazy-mounted overlays register (dynamic import / mount-gate).
 * Retries across animation frames until the focus key exists or attempts are exhausted.
 */
export function seedTvFocus(focusKey: string, maxAttempts = DEFAULT_FOCUS_SEED_ATTEMPTS): void {
    if (typeof window === 'undefined') {
        return;
    }

    let attempts = 0;

    const attempt = () => {
        try {
            setFocus(focusKey);
            return;
        } catch {
            // Focus target not registered yet.
        }

        attempts += 1;
        if (attempts < maxAttempts) {
            requestAnimationFrame(attempt);
        }
    };

    requestAnimationFrame(attempt);
}
