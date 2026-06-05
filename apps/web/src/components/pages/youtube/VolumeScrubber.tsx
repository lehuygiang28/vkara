'use client';

import { useState, type CSSProperties } from 'react';

import type { ScrubberValueHandlers } from '@/hooks/use-scrubber-value';
import { cn } from '@/lib/utils';

import { Slider } from '@/components/ui/slider';
import {
    getScrubEdgeSliderClasses,
    getScrubThumbCenter,
    SCRUB_SLIDER_CLASS,
    SCRUB_TRACK_EXPANDED_CLASS,
} from '@/components/pages/youtube/scrub-slider-styles';

interface VolumeScrubberProps {
    shownVolume: number;
    isAdjusting: boolean;
    disabled?: boolean;
    ariaLabel: string;
    className?: string;
    handlers: ScrubberValueHandlers;
    showDragValue?: boolean;
}

export function VolumeScrubber({
    shownVolume,
    isAdjusting,
    disabled = false,
    ariaLabel,
    className,
    handlers,
    showDragValue = false,
}: VolumeScrubberProps) {
    const [isTrackPressed, setIsTrackPressed] = useState(false);
    const clampedVolume = Math.min(100, Math.max(0, shownVolume));
    const volumeRatio = clampedVolume / 100;
    const isAtStart = clampedVolume <= 0;
    const isAtEnd = clampedVolume >= 100;
    const scrubPosition = isAtStart ? '0%' : isAtEnd ? '100%' : getScrubThumbCenter(volumeRatio);
    const isTrackExpanded = isAdjusting || isTrackPressed;

    const releaseTrackPress = () => {
        setIsTrackPressed(false);
    };

    const handleTrackPointerDown = () => {
        if (!disabled) {
            setIsTrackPressed(true);
            handlers.onPointerDown();
        }
    };

    const handleTrackPointerUp = () => {
        releaseTrackPress();
        handlers.onPointerUp();
    };

    return (
        <div
            className={cn('relative min-w-0 flex-1 select-none', className)}
            style={{ '--scrub-position': scrubPosition } as CSSProperties}
        >
            {showDragValue && isAdjusting ? (
                <div
                    className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium tabular-nums text-background shadow-md"
                    style={{ left: 'var(--scrub-position)' }}
                    aria-hidden
                >
                    {clampedVolume}
                </div>
            ) : null}

            <div
                className={cn(
                    'px-0.5',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                    isAdjusting && 'cursor-grabbing',
                )}
                onPointerDown={handleTrackPointerDown}
                onPointerUp={handleTrackPointerUp}
                onPointerCancel={handleTrackPointerUp}
                onLostPointerCapture={releaseTrackPress}
            >
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    disabled={disabled}
                    value={[clampedVolume]}
                    onValueChange={handlers.onValueChange}
                    onValueCommit={handlers.onValueCommit}
                    aria-label={ariaLabel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={clampedVolume}
                    aria-valuetext={`${clampedVolume}%`}
                    className={cn(
                        SCRUB_SLIDER_CLASS,
                        disabled && 'pointer-events-none',
                        isAdjusting && 'cursor-grabbing [&_[role=slider]]:opacity-100',
                        isAdjusting && '[&_[role=slider]]:after:scale-125',
                        isTrackExpanded && SCRUB_TRACK_EXPANDED_CLASS,
                        getScrubEdgeSliderClasses(isAtStart, isAtEnd),
                    )}
                />
            </div>
        </div>
    );
}
