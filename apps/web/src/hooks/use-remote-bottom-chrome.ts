'use client';

import { useCallback, useEffect, type RefObject } from 'react';

import { REMOTE_CHROME_MARKERS } from '@/lib/remote-chrome';

interface UseRemoteBottomChromeOptions {
    /** When false, --vkara-now-playing-height is cleared (call after close animation ends). */
    nowPlayingVisible: boolean;
}

/**
 * Syncs remote bottom chrome dimensions to CSS variables for scroll padding and toasts.
 */
export function useRemoteBottomChrome(
    containerRef: RefObject<HTMLElement | null>,
    { nowPlayingVisible }: UseRemoteBottomChromeOptions,
) {
    const syncHeights = useCallback(() => {
        const root = document.documentElement;
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const nav = container.querySelector<HTMLElement>(
            `[${REMOTE_CHROME_MARKERS.mobileNav}]`,
        );
        const panel = container.querySelector<HTMLElement>(
            `[${REMOTE_CHROME_MARKERS.nowPlayingPanel}]`,
        );

        const navHeight = nav?.offsetHeight ?? 0;
        const panelHeight =
            nowPlayingVisible && panel ? panel.offsetHeight : 0;

        root.style.setProperty(
            '--vkara-now-playing-height',
            panelHeight > 0 ? `${panelHeight}px` : '0px',
        );
        root.style.setProperty(
            '--vkara-mobile-nav-height',
            navHeight > 0 ? `${navHeight}px` : '0px',
        );
    }, [containerRef, nowPlayingVisible]);

    useEffect(() => {
        syncHeights();

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const nav = container.querySelector<HTMLElement>(
            `[${REMOTE_CHROME_MARKERS.mobileNav}]`,
        );
        const panel = container.querySelector<HTMLElement>(
            `[${REMOTE_CHROME_MARKERS.nowPlayingPanel}]`,
        );

        const observer = new ResizeObserver(syncHeights);
        if (nav) {
            observer.observe(nav);
        }
        if (panel) {
            observer.observe(panel);
        }

        return () => {
            observer.disconnect();
            document.documentElement.style.setProperty('--vkara-now-playing-height', '0rem');
            document.documentElement.style.setProperty('--vkara-mobile-nav-height', '3.75rem');
        };
    }, [containerRef, syncHeights]);
}
