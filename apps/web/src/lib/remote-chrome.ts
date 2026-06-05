import type { Transition } from 'framer-motion';

/**
 * Remote bottom chrome layout contract.
 *
 * Provider + scroll components live in `components/pages/youtube/remote-chrome/`.
 * `--vkara-remote-inset-bottom` = now-playing height + gap (nav excluded).
 */

/** Shared timing for now-playing bar slide + dependent layout effects. */
export const NOW_PLAYING_BAR_MS = {
    open: 260,
    close: 340,
} as const;

export const nowPlayingBarTransitions = {
    open: {
        duration: NOW_PLAYING_BAR_MS.open / 1000,
        ease: [0.16, 1, 0.3, 1],
    },
    close: {
        duration: NOW_PLAYING_BAR_MS.close / 1000,
        ease: [0.4, 0, 0.2, 1],
    },
} satisfies Record<'open' | 'close', Transition>;

/** Gap between scroll content and the floating now-playing bar. */
export const REMOTE_CONTENT_INSET_GAP = '0.75rem';

export const REMOTE_CHROME_CSS_VARS = {
    mobileNavHeight: '--vkara-mobile-nav-height',
    nowPlayingHeight: '--vkara-now-playing-height',
    insetBottom: '--vkara-remote-inset-bottom',
} as const;

export const REMOTE_CHROME_DEFAULTS = {
    mobileNavHeight: '3.75rem',
    nowPlayingHeight: '0px',
    insetBottom: '0px',
} as const;

export const REMOTE_CHROME_DATASET = {
    attribute: 'vkaraRemoteChrome',
    modes: { none: 'none', full: 'full' },
} as const;

/**
 * - `open` — bar visible on list tabs
 * - `closing` — bar animating away (controls tab); toast height still tracked
 * - `hidden` — bar dismissed
 */
export type NowPlayingLayoutPhase = 'hidden' | 'open' | 'closing';

export function deriveLayoutPhase(
    showNowPlayingBar: boolean,
    measureBarHeight: boolean,
): NowPlayingLayoutPhase {
    if (showNowPlayingBar) {
        return 'open';
    }
    if (measureBarHeight) {
        return 'closing';
    }
    return 'hidden';
}

export type RemoteChromeMeasurements = {
    mobileNavHeightPx: number;
    nowPlayingHeightPx: number;
    contentInsetHeightPx: number;
};

export function applyRemoteChromeVars(
    root: HTMLElement,
    { mobileNavHeightPx, nowPlayingHeightPx, contentInsetHeightPx }: RemoteChromeMeasurements,
): void {
    root.style.setProperty(
        REMOTE_CHROME_CSS_VARS.mobileNavHeight,
        mobileNavHeightPx > 0 ? `${mobileNavHeightPx}px` : REMOTE_CHROME_DEFAULTS.mobileNavHeight,
    );
    root.style.setProperty(
        REMOTE_CHROME_CSS_VARS.nowPlayingHeight,
        nowPlayingHeightPx > 0
            ? `${nowPlayingHeightPx}px`
            : REMOTE_CHROME_DEFAULTS.nowPlayingHeight,
    );
    root.style.setProperty(
        REMOTE_CHROME_CSS_VARS.insetBottom,
        contentInsetHeightPx > 0
            ? `calc(${contentInsetHeightPx}px + ${REMOTE_CONTENT_INSET_GAP})`
            : REMOTE_CHROME_DEFAULTS.insetBottom,
    );
}

export function resetRemoteChromeVars(root: HTMLElement): void {
    applyRemoteChromeVars(root, {
        mobileNavHeightPx: 0,
        nowPlayingHeightPx: 0,
        contentInsetHeightPx: 0,
    });
}
