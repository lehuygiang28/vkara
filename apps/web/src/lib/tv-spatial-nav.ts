import { init, setKeyMap } from '@noriginmedia/norigin-spatial-navigation-core';

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
    'MediaTrackNext',
    'MediaTrackPrevious',
    'AudioVolumeUp',
    'AudioVolumeDown',
    'AudioVolumeMute',
    'ChannelUp',
    'ChannelDown',
    'BrowserBack',
]);

export const TV_BACK_KEYS = new Set(['Escape', 'Backspace', 'Back', 'BrowserBack']);

let spatialNavInitialized = false;

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

export function isTvRevealKey(key: string): boolean {
    return TV_REVEAL_KEYS.has(key);
}

export function isTvBackKey(key: string): boolean {
    return TV_BACK_KEYS.has(key);
}

/** D-pad / OK — used to seed idle focus when spatial tree has no active leaf. */
export function isTvNavigationKey(key: string): boolean {
    return (
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'Enter' ||
        key === ' '
    );
}
