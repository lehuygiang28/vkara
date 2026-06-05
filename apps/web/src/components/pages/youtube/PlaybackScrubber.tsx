'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useScrubberValue } from '@/hooks/use-scrubber-value';
import { useScopedI18n } from '@/locales/client';
import { formatPlaybackSeconds } from '@/lib/format-playback-time';
import { cn } from '@/lib/utils';

import { Slider } from '@/components/ui/slider';
import {
    getScrubEdgeSliderClasses,
    getScrubThumbCenter,
    SCRUB_SLIDER_CLASS,
    SCRUB_TRACK_EXPANDED_CLASS,
} from '@/components/pages/youtube/scrub-slider-styles';

interface PlaybackScrubberProps {
    displayTime: number;
    duration: number;
    durationLabel?: string;
    disabled?: boolean;
    onSeek: (seconds: number) => void;
    className?: string;
}

export function PlaybackScrubber({
    displayTime,
    duration,
    durationLabel,
    disabled = false,
    onSeek,
    className,
}: PlaybackScrubberProps) {
    const t = useScopedI18n('youtubePage');
    const max = Math.max(1, Math.floor(duration));
    const syncedTime = Math.min(displayTime, max);
    const [isTrackPressed, setIsTrackPressed] = useState(false);
    const [sliderKey, setSliderKey] = useState(0);
    const prevDisplayTimeRef = useRef(displayTime);

    const clampTime = (seconds: number) => Math.min(max, Math.max(0, seconds));

    const {
        shownValue: shownTime,
        isAdjusting: isScrubbing,
        handlers,
    } = useScrubberValue({
        value: syncedTime,
        clampAction: clampTime,
        onCommitAction: onSeek,
    });

    useEffect(() => {
        const prev = prevDisplayTimeRef.current;
        if (!isScrubbing && displayTime < prev - 2) {
            setSliderKey((k) => k + 1);
        }
        prevDisplayTimeRef.current = displayTime;
    }, [displayTime, isScrubbing]);

    const scrubRatio = shownTime / max;
    const isAtStart = shownTime <= 0;
    const isAtEnd = shownTime >= max;
    const scrubPosition = isAtStart ? '0%' : isAtEnd ? '100%' : getScrubThumbCenter(scrubRatio);
    const isTrackExpanded = isScrubbing || isTrackPressed;

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
            className={cn('relative w-full select-none', className)}
            style={{ '--scrub-position': scrubPosition } as CSSProperties}
        >
            {isScrubbing ? (
                <div
                    className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium tabular-nums text-background shadow-md"
                    style={{ left: 'var(--scrub-position)' }}
                    aria-hidden
                >
                    {formatPlaybackSeconds(shownTime)}
                </div>
            ) : null}

            <div
                className={cn(
                    'px-0.5',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                    isScrubbing && 'cursor-grabbing',
                )}
                onPointerDown={handleTrackPointerDown}
                onPointerUp={handleTrackPointerUp}
                onPointerCancel={handleTrackPointerUp}
                onLostPointerCapture={releaseTrackPress}
            >
                <Slider
                    key={sliderKey}
                    min={0}
                    max={max}
                    step={1}
                    disabled={disabled}
                    value={[shownTime]}
                    onValueChange={handlers.onValueChange}
                    onValueCommit={handlers.onValueCommit}
                    aria-label={t('playbackProgress')}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-valuenow={shownTime}
                    aria-valuetext={formatPlaybackSeconds(shownTime)}
                    className={cn(
                        SCRUB_SLIDER_CLASS,
                        disabled && 'pointer-events-none',
                        isScrubbing && 'cursor-grabbing [&_[role=slider]]:opacity-100',
                        isScrubbing && '[&_[role=slider]]:after:scale-125',
                        isTrackExpanded && SCRUB_TRACK_EXPANDED_CLASS,
                        getScrubEdgeSliderClasses(isAtStart, isAtEnd),
                    )}
                />
            </div>

            <div className="flex justify-between px-0.5 text-xs tabular-nums text-muted-foreground">
                <span
                    className={cn(
                        'transition-colors',
                        isScrubbing && 'font-medium text-foreground',
                    )}
                >
                    {formatPlaybackSeconds(shownTime)}
                </span>
                <span>{durationLabel ?? formatPlaybackSeconds(duration)}</span>
            </div>
        </div>
    );
}
