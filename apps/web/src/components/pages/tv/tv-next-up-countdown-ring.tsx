'use client';

import { cn } from '@/lib/utils';
import {
    getCountdownRingProgress,
    NEXT_VIDEO_COUNTDOWN_SECONDS,
} from '@/store/countdownTimersStore';

const RING_SIZE = 136;
const STROKE_WIDTH = 8;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TvNextUpCountdownRingProps = {
    remainingSeconds: number;
    totalSeconds?: number;
    label: string;
    compact?: boolean;
    className?: string;
};

export function TvNextUpCountdownRing({
    remainingSeconds,
    totalSeconds = NEXT_VIDEO_COUNTDOWN_SECONDS,
    label,
    compact = false,
    className,
}: TvNextUpCountdownRingProps) {
    const clampedRemaining = Math.max(0, Math.min(totalSeconds, remainingSeconds));
    const progress = getCountdownRingProgress(clampedRemaining, totalSeconds);
    const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    return (
        <div className={cn('tv-next-up-countdown', compact && 'tv-next-up-countdown--compact', className)}>
            <div
                className="tv-next-up-countdown__ring"
                role="timer"
                aria-live="polite"
                aria-label={`${label} ${clampedRemaining}`}
            >
                <svg
                    className="tv-next-up-countdown__svg"
                    viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                    aria-hidden
                >
                    <circle
                        className="tv-next-up-countdown__track"
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={STROKE_WIDTH}
                    />
                    <circle
                        className="tv-next-up-countdown__progress"
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={RADIUS}
                        fill="none"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                    />
                </svg>
                <span className="tv-next-up-countdown__value" aria-hidden>
                    {clampedRemaining}
                </span>
            </div>
            <p className="tv-next-up-countdown__label">{label}</p>
        </div>
    );
}
