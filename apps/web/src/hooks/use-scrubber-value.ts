'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export type ScrubberValueHandlers = {
    onPointerDown: () => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onValueChange: (value: number[]) => void;
    onValueCommit: (value: number[]) => void;
};

type UseScrubberValueOptions = {
    value: number;
    clampAction?: (value: number) => number;
    debounceMs?: number;
    onSyncAction?: (value: number) => void;
    onCommitAction: (value: number) => void;
    onGestureBeginAction?: (fromValue: number) => void;
    onGestureEndAction?: (finalValue: number) => void;
};

export function useScrubberValue({
    value,
    clampAction: clamp = (next) => next,
    debounceMs,
    onSyncAction: onSync,
    onCommitAction: onCommit,
    onGestureBeginAction: onGestureBegin,
    onGestureEndAction: onGestureEnd,
}: UseScrubberValueOptions) {
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [scrubValue, setScrubValue] = useState(value);
    const isAdjustingRef = useRef(false);
    const scrubValueRef = useRef(value);

    useEffect(() => {
        if (!isAdjusting) {
            scrubValueRef.current = value;
            setScrubValue(value);
        }
    }, [value, isAdjusting]);

    const debouncedSync = useDebouncedCallback(
        (next: number) => {
            onSync?.(next);
        },
        debounceMs ?? 0,
        { leading: true, trailing: true },
    );

    const beginGesture = useCallback(() => {
        if (isAdjustingRef.current) {
            return;
        }

        isAdjustingRef.current = true;
        setIsAdjusting(true);
        scrubValueRef.current = value;
        setScrubValue(value);
        onGestureBegin?.(value);
    }, [onGestureBegin, value]);

    const finishGesture = useCallback(
        (next: number) => {
            if (!isAdjustingRef.current) {
                return;
            }

            if (debounceMs !== undefined) {
                debouncedSync.cancel();
            }

            const clamped = clamp(next);
            isAdjustingRef.current = false;
            setIsAdjusting(false);
            onGestureEnd?.(clamped);
            scrubValueRef.current = clamped;
            setScrubValue(clamped);
            onCommit(clamped);
        },
        [clamp, debounceMs, debouncedSync, onCommit, onGestureEnd],
    );

    const handlePointerDown = useCallback(() => {
        beginGesture();
    }, [beginGesture]);

    const handlePointerUp = useCallback(() => {
        finishGesture(scrubValueRef.current);
    }, [finishGesture]);

    const handleValueChange = useCallback(
        (nextValue: number[]) => {
            if (!isAdjustingRef.current) {
                beginGesture();
            }

            const next = clamp(nextValue[0] ?? 0);
            scrubValueRef.current = next;
            setScrubValue(next);

            if (debounceMs !== undefined && onSync) {
                debouncedSync(next);
            }
        },
        [beginGesture, clamp, debounceMs, debouncedSync, onSync],
    );

    const handleValueCommit = useCallback(
        (nextValue: number[]) => {
            finishGesture(nextValue[0] ?? 0);
        },
        [finishGesture],
    );

    const cancelPendingSync = useCallback(() => {
        if (debounceMs !== undefined) {
            debouncedSync.cancel();
        }
    }, [debounceMs, debouncedSync]);

    return {
        shownValue: isAdjusting ? scrubValue : value,
        isAdjusting,
        handlers: {
            onPointerDown: handlePointerDown,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            onValueChange: handleValueChange,
            onValueCommit: handleValueCommit,
        },
        cancelPendingSync,
    };
}
