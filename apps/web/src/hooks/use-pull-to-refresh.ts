'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type UsePullToRefreshOptions = {
    onRefresh?: () => void | Promise<void>;
    elementRef: RefObject<HTMLElement | null>;
    refreshThreshold?: number;
    maximumPullLength?: number;
    enableResistance?: boolean;
    isDisabled?: boolean;
};

export type UsePullToRefreshResult = {
    isRefreshing: boolean;
    /** Current pull distance in px; 0 when idle. */
    pullPosition: number;
};

function applyResistance(rawPullLength: number, maximumPullLength: number): number {
    const resistanceMultiplier = 1 - Math.min(rawPullLength / (maximumPullLength * 2.5), 0.8);
    return rawPullLength * resistanceMultiplier;
}

/**
 * Touch pull-to-refresh for a scroll container (not window scroll).
 * Used with virtualized lists where wrapper-based PTR libraries do not fit.
 */
export function usePullToRefresh({
    onRefresh,
    elementRef,
    refreshThreshold = 72,
    maximumPullLength = 96,
    enableResistance = true,
    isDisabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
    const [pullPosition, setPullPosition] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const pullStartYRef = useRef(0);
    const pullPositionRef = useRef(0);
    const renderedPullPositionRef = useRef(0);
    const pullFrameRef = useRef<number | null>(null);
    const isRefreshingRef = useRef(false);
    const isDisabledRef = useRef(isDisabled);

    useEffect(() => {
        isRefreshingRef.current = isRefreshing;
    }, [isRefreshing]);

    useEffect(() => {
        isDisabledRef.current = isDisabled;
    }, [isDisabled]);

    const flushPullPosition = useCallback(() => {
        pullFrameRef.current = null;
        const next = pullPositionRef.current;
        if (next === renderedPullPositionRef.current) {
            return;
        }

        renderedPullPositionRef.current = next;
        setPullPosition(next);
    }, []);

    const schedulePullPosition = useCallback(
        (next: number) => {
            pullPositionRef.current = next;
            if (pullFrameRef.current !== null) {
                return;
            }

            pullFrameRef.current = window.requestAnimationFrame(flushPullPosition);
        },
        [flushPullPosition],
    );

    const resetPull = useCallback(() => {
        pullStartYRef.current = 0;
        pullPositionRef.current = 0;
        renderedPullPositionRef.current = 0;
        if (pullFrameRef.current !== null) {
            window.cancelAnimationFrame(pullFrameRef.current);
            pullFrameRef.current = null;
        }
        setPullPosition(0);
    }, []);

    const onTouchStart = useCallback(
        (event: TouchEvent) => {
            if (isDisabledRef.current || isRefreshingRef.current) return;

            const scrollTop = elementRef.current?.scrollTop ?? 0;
            if (scrollTop > 0) return;

            const touch = event.targetTouches[0];
            if (!touch) return;

            pullStartYRef.current = touch.clientY;
        },
        [elementRef],
    );

    const onTouchMove = useCallback(
        (event: TouchEvent) => {
            if (isDisabledRef.current || isRefreshingRef.current || pullStartYRef.current === 0) {
                return;
            }

            const touch = event.targetTouches[0];
            if (!touch) return;

            const scrollTop = elementRef.current?.scrollTop ?? 0;
            if (scrollTop > 0) {
                resetPull();
                return;
            }

            const rawPullLength =
                touch.clientY > pullStartYRef.current ? touch.clientY - pullStartYRef.current : 0;

            let nextPullLength = rawPullLength;
            if (enableResistance && rawPullLength > 0) {
                nextPullLength = applyResistance(rawPullLength, maximumPullLength);
            }

            const clampedPullLength = Math.min(nextPullLength, maximumPullLength);
            schedulePullPosition(clampedPullLength);
        },
        [elementRef, enableResistance, maximumPullLength, resetPull, schedulePullPosition],
    );

    const onTouchEnd = useCallback(() => {
        if (isDisabledRef.current || isRefreshingRef.current || pullStartYRef.current === 0) {
            return;
        }

        const finalPullPosition = pullPositionRef.current;
        pullStartYRef.current = 0;

        if (finalPullPosition < refreshThreshold || !onRefresh) {
            resetPull();
            return;
        }

        setIsRefreshing(true);
        schedulePullPosition(0);

        try {
            const result = onRefresh();
            if (!result || typeof result.then !== 'function') {
                setIsRefreshing(false);
                return;
            }

            void result.finally(() => setIsRefreshing(false));
        } catch {
            setIsRefreshing(false);
        }
    }, [onRefresh, refreshThreshold, resetPull, schedulePullPosition]);

    useEffect(() => {
        if (isDisabled) {
            resetPull();
            return;
        }

        const target = elementRef.current;
        if (!target) return;

        const options: AddEventListenerOptions = { passive: true };
        target.addEventListener('touchstart', onTouchStart, options);
        target.addEventListener('touchmove', onTouchMove, options);
        target.addEventListener('touchend', onTouchEnd, options);
        target.addEventListener('touchcancel', onTouchEnd, options);

        return () => {
            target.removeEventListener('touchstart', onTouchStart);
            target.removeEventListener('touchmove', onTouchMove);
            target.removeEventListener('touchend', onTouchEnd);
            target.removeEventListener('touchcancel', onTouchEnd);
            if (pullFrameRef.current !== null) {
                window.cancelAnimationFrame(pullFrameRef.current);
                pullFrameRef.current = null;
            }
        };
    }, [elementRef, isDisabled, onTouchEnd, onTouchMove, onTouchStart, resetPull]);

    return { isRefreshing, pullPosition };
}
