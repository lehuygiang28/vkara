'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Measures remote bottom chrome (now playing bar + mobile nav) and syncs CSS vars
 * for scroll padding, toasts, and floating action UI.
 */
export function useRemoteBottomChrome(
    bottomChromeRef: RefObject<HTMLElement | null>,
    /** Re-measure when chrome children mount/unmount (e.g. now playing bar visibility). */
    chromeVisible = true,
) {
    useEffect(() => {
        const root = document.documentElement;
        const container = bottomChromeRef.current;
        if (!container) {
            return;
        }

        const syncHeights = () => {
            const nowPlaying = container.querySelector<HTMLElement>('[data-vkara-now-playing]');
            const nav = container.querySelector<HTMLElement>('[data-vkara-mobile-nav]');

            const npHeight = nowPlaying?.getBoundingClientRect().height ?? 0;
            const navHeight = nav?.getBoundingClientRect().height ?? 0;

            root.style.setProperty(
                '--vkara-now-playing-height',
                npHeight > 0 ? `${npHeight}px` : '0px',
            );
            root.style.setProperty(
                '--vkara-mobile-nav-height',
                navHeight > 0 ? `${navHeight}px` : '0px',
            );
        };

        syncHeights();

        const observer = new ResizeObserver(syncHeights);
        observer.observe(container);

        const observed = new Set<Element>();
        const observeTree = (node: Element) => {
            if (observed.has(node)) {
                return;
            }
            observed.add(node);
            if (node instanceof HTMLElement) {
                observer.observe(node);
            }
            for (const child of node.children) {
                observeTree(child);
            }
        };
        observeTree(container);

        const mutationObserver = new MutationObserver(() => {
            observeTree(container);
            syncHeights();
        });
        mutationObserver.observe(container, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
            root.style.setProperty('--vkara-now-playing-height', '0rem');
            root.style.setProperty('--vkara-mobile-nav-height', '3.75rem');
        };
    }, [bottomChromeRef, chromeVisible]);
}
