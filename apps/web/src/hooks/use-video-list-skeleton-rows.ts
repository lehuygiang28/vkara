'use client';

import { useEffect, useState, type RefObject } from 'react';

import {
    VIDEO_LIST_SKELETON_PAGE_ROWS,
    measureVideoListSkeletonRows,
} from '@/lib/video-list-layout';

export {
    getVideoListStackHeight,
    getVideoListSkeletonBlockHeight,
    measureVideoListSkeletonRows,
} from '@/lib/video-list-layout';

type UseVideoListSkeletonRowsOptions = {
    /** Rows before viewport measurement (default: {@link VIDEO_LIST_SKELETON_PAGE_ROWS}). */
    fallback?: number;
    /** Portion of scroll viewport to cover (default `1` = full page). Load-more uses `0.5`. */
    viewportFraction?: number;
    minRows?: number;
    /** When false, measure once when active (load-more). When true, keep ResizeObserver (initial load). */
    observe?: boolean;
};

/**
 * Rows needed to cover a portion of the scroll viewport — initial load (full) or load-more (half).
 */
export function useVideoListSkeletonRows(
    scrollRef: RefObject<HTMLElement | null>,
    active: boolean,
    {
        fallback = VIDEO_LIST_SKELETON_PAGE_ROWS,
        viewportFraction = 1,
        minRows = 3,
        observe = true,
    }: UseVideoListSkeletonRowsOptions = {},
): number {
    const [rowCount, setRowCount] = useState(fallback);

    useEffect(() => {
        if (!active) return;

        let observer: ResizeObserver | undefined;
        let rafId = 0;

        const commit = (next: number) => {
            setRowCount((prev) => (prev === next ? prev : next));
        };

        const bind = () => {
            const element = scrollRef.current;
            if (!element) {
                rafId = requestAnimationFrame(bind);
                return;
            }

            const measure = () => {
                commit(
                    measureVideoListSkeletonRows(element.clientHeight, {
                        viewportFraction,
                        minRows,
                    }),
                );
            };

            measure();
            if (!observe) return;

            observer = new ResizeObserver(measure);
            observer.observe(element);
        };

        bind();

        return () => {
            cancelAnimationFrame(rafId);
            observer?.disconnect();
        };
    }, [active, minRows, observe, scrollRef, viewportFraction]);

    return active ? rowCount : fallback;
}
