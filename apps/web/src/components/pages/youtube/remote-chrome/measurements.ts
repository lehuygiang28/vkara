'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';

import { applyRemoteChromeVars, resetRemoteChromeVars } from '@/lib/remote-chrome';

export type ChromeMeasureRefs = {
    navRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLElement | null>;
};

type SyncRemoteChromeMeasurementsOptions = {
    /** Keep `--vkara-now-playing-height` until close animation finishes (toasts). */
    measureBarHeight: boolean;
    /** Set `--vkara-remote-inset-bottom`; false immediately on controls tab. */
    reserveContentInset: boolean;
    /** Re-attach observers when the now-playing panel mounts. */
    hasPlaying: boolean;
};

function readElementHeight(element: HTMLElement | null): number {
    if (!element) {
        return 0;
    }

    const layoutHeight = element.offsetHeight;
    return layoutHeight > 0 ? layoutHeight : Math.round(element.getBoundingClientRect().height);
}

/** Observes nav + now-playing panel and writes layout CSS variables to `documentElement`. */
export function useSyncRemoteChromeMeasurements(
    { navRef, panelRef }: ChromeMeasureRefs,
    { measureBarHeight, reserveContentInset, hasPlaying }: SyncRemoteChromeMeasurementsOptions,
) {
    const cachedPanelHeightRef = useRef(0);

    const syncHeights = useCallback(() => {
        const measuredPanelHeight = readElementHeight(panelRef.current);
        if (measuredPanelHeight > 0) {
            cachedPanelHeightRef.current = measuredPanelHeight;
        }

        const panelHeightPx =
            measuredPanelHeight > 0 ? measuredPanelHeight : cachedPanelHeightRef.current;

        applyRemoteChromeVars(document.documentElement, {
            mobileNavHeightPx: navRef.current?.offsetHeight ?? 0,
            nowPlayingHeightPx: measureBarHeight && panelHeightPx > 0 ? panelHeightPx : 0,
            contentInsetHeightPx: reserveContentInset && panelHeightPx > 0 ? panelHeightPx : 0,
        });
    }, [navRef, panelRef, measureBarHeight, reserveContentInset]);

    useEffect(() => {
        syncHeights();

        const observer = new ResizeObserver(syncHeights);
        const nav = navRef.current;
        const panel = panelRef.current;

        if (nav) {
            observer.observe(nav);
        }
        if (panel) {
            observer.observe(panel);
        }

        const raf = window.requestAnimationFrame(syncHeights);

        return () => {
            window.cancelAnimationFrame(raf);
            observer.disconnect();
            resetRemoteChromeVars(document.documentElement);
        };
    }, [navRef, panelRef, syncHeights, hasPlaying]);
}
