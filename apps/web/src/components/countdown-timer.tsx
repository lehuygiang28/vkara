'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useCountdownStore } from '@/store/countdownTimersStore';

interface CountdownTimerProps {
    initialSeconds: number;
    onCountdownComplete: () => void;
    show?: boolean;
    classNames?: string;
}

export function CountdownTimer({
    initialSeconds,
    onCountdownComplete,
    show = true,
    classNames,
}: CountdownTimerProps) {
    const isActive = useCountdownStore((state) => state.isActive);
    const remainingSeconds = useCountdownStore((state) => state.remainingSeconds);
    const shouldShowTimer = useCountdownStore((state) => state.shouldShowTimer);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const onCompleteRef = useRef(onCountdownComplete);

    useEffect(() => {
        onCompleteRef.current = onCountdownComplete;
    }, [onCountdownComplete]);

    useEffect(() => {
        if (!show || !shouldShowTimer) {
            return;
        }

        const { startCountdown, setRemainingSeconds, cancelCountdown } =
            useCountdownStore.getState();
        startCountdown(initialSeconds);

        timerRef.current = setInterval(() => {
            setRemainingSeconds((prev: number) => {
                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    cancelCountdown();
                    onCompleteRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [show, shouldShowTimer, initialSeconds]);

    if (!isActive || !shouldShowTimer || !show) return null;

    return (
        <span className={cn(classNames)} role="timer" aria-live="polite">
            {remainingSeconds}s
        </span>
    );
}
