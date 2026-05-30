'use client';

import { useEffect, useRef, type RefObject } from 'react';

type UseInfiniteScrollSentinelOptions = {
    rootRef: RefObject<HTMLElement | null>;
    sentinelRef: RefObject<Element | null>;
    enabled: boolean;
    isLoading: boolean;
    onLoadMoreAction?: () => void;
};

/** Observes a sentinel inside a scroll root and calls `onLoadMore` once per loading cycle. */
export function useInfiniteScrollSentinel({
    rootRef,
    sentinelRef,
    enabled,
    isLoading,
    onLoadMoreAction: onLoadMore,
}: UseInfiniteScrollSentinelOptions) {
    const lockRef = useRef(false);

    useEffect(() => {
        if (!isLoading) {
            lockRef.current = false;
        }
    }, [isLoading]);

    useEffect(() => {
        const root = rootRef.current;
        const target = sentinelRef.current;
        if (!root || !target || !enabled || isLoading || !onLoadMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting || lockRef.current) return;
                lockRef.current = true;
                onLoadMore();
            },
            { root, rootMargin: '160px', threshold: 0 },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [enabled, isLoading, onLoadMore, rootRef, sentinelRef]);
}
