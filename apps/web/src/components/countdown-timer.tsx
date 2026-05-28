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
    const {
        isActive,
        remainingSeconds,
        shouldShowTimer,
        startCountdown,
        cancelCountdown,
        completeCountdown,
        setRemainingSeconds,
        setOnComplete,
    } = useCountdownStore();

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            cancelCountdown();
        };
    }, [cancelCountdown]);

    useEffect(() => {
        if (show && shouldShowTimer && !isActive) {
            startCountdown(initialSeconds);
            setOnComplete(onCountdownComplete);

            timerRef.current = setInterval(() => {
                setRemainingSeconds((prev: number) => {
                    if (prev <= 1) {
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                            timerRef.current = null;
                        }
                        completeCountdown();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    }, [
        show,
        shouldShowTimer,
        isActive,
        initialSeconds,
        startCountdown,
        setRemainingSeconds,
        setOnComplete,
        onCountdownComplete,
        completeCountdown,
    ]);

    if (!isActive || !shouldShowTimer || !show) return null;

    return (
        <span className={cn(classNames)} role="timer" aria-live="polite">
            {remainingSeconds}s
        </span>
    );
}
