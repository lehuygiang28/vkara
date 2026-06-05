import type { Transition } from 'framer-motion';

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

/** Measured by useRemoteBottomChrome via these markers. */
export const REMOTE_CHROME_MARKERS = {
    nowPlayingPanel: 'data-vkara-now-playing-panel',
    mobileNav: 'data-vkara-mobile-nav',
} as const;
