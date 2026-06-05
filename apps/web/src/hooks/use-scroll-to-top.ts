'use client';

import { useCallback, useState, type RefObject } from 'react';

export const SCROLL_TO_TOP_THRESHOLD = 200;

type UseScrollToTopOptions = {
    threshold?: number;
    onBeforeScroll?: () => void;
};

export function useScrollToTop(
    scrollRef: RefObject<HTMLDivElement | null>,
    options?: UseScrollToTopOptions,
) {
    const threshold = options?.threshold ?? SCROLL_TO_TOP_THRESHOLD;
    const onBeforeScroll = options?.onBeforeScroll;
    const [showScrollTop, setShowScrollTop] = useState(false);

    const handleScroll = useCallback(() => {
        setShowScrollTop((scrollRef.current?.scrollTop ?? 0) > threshold);
    }, [scrollRef, threshold]);

    const scrollToTop = useCallback(() => {
        onBeforeScroll?.();
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        scrollEl.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [onBeforeScroll, scrollRef]);

    return { showScrollTop, handleScroll, scrollToTop };
}
