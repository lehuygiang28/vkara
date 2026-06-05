'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const SCROLL_TO_TOP_THRESHOLD = 200;

type UseScrollToTopOptions = {
    threshold?: number;
    onBeforeScroll?: () => void;
};

function readScrollTopVisible(scrollTop: number, threshold: number): boolean {
    return scrollTop > threshold;
}

/**
 * Scroll-to-top visibility for a scroll container.
 * Pass `scrollElement` from a callback ref so the passive listener attaches after mount.
 */
export function useScrollToTop(
    scrollElement: HTMLDivElement | null,
    scrollRef: RefObject<HTMLDivElement | null>,
    options?: UseScrollToTopOptions,
) {
    const threshold = options?.threshold ?? SCROLL_TO_TOP_THRESHOLD;
    const onBeforeScroll = options?.onBeforeScroll;
    const [showScrollTop, setShowScrollTop] = useState(false);
    const showScrollTopRef = useRef(false);

    useEffect(() => {
        if (!scrollElement) {
            showScrollTopRef.current = false;
            setShowScrollTop(false);
            return;
        }

        const syncVisibility = () => {
            const next = readScrollTopVisible(scrollElement.scrollTop, threshold);
            if (next === showScrollTopRef.current) {
                return;
            }

            showScrollTopRef.current = next;
            setShowScrollTop(next);
        };

        syncVisibility();
        scrollElement.addEventListener('scroll', syncVisibility, { passive: true });

        return () => {
            scrollElement.removeEventListener('scroll', syncVisibility);
        };
    }, [scrollElement, threshold]);

    const scrollToTop = useCallback(() => {
        onBeforeScroll?.();
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollEl.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [onBeforeScroll, scrollRef]);

    return { showScrollTop, scrollToTop };
}
