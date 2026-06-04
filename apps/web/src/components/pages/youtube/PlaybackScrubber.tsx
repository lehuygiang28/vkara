'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useScopedI18n } from '@/locales/client';
import { formatPlaybackSeconds } from '@/lib/format-playback-time';
import { cn } from '@/lib/utils';

import { Slider } from '@/components/ui/slider';

interface PlaybackScrubberProps {
    displayTime: number;
    duration: number;
    durationLabel?: string;
    disabled?: boolean;
    onSeek: (seconds: number) => void;
    className?: string;
}

/** Matches visible knob `[&_[role=slider]]:w-3.5` (Radix positions this width on the track). */
const SCRUB_THUMB_HIT_REM = 0.875;
const SCRUB_THUMB_HALF_REM = SCRUB_THUMB_HIT_REM / 2;

/** Thumb center X on the full track — same inset math Radix uses for wide thumbs. */
function getScrubThumbCenter(ratio: number): string {
    const clamped = Math.min(1, Math.max(0, ratio));
    return `calc(${SCRUB_THUMB_HALF_REM}rem + (100% - ${SCRUB_THUMB_HIT_REM}rem) * ${clamped})`;
}

/** Visual rail thickens via transform; track element stays tall for real hit-testing. */
const SCRUB_TRACK_EXPANDED_CLASS = '[&>span:first-child]:after:scale-y-[1.5]';

const SCRUB_SLIDER_CLASS = cn(
    'group/scrub relative h-11 w-full',
    'cursor-pointer touch-none select-none',
    '[&>span:first-child]:relative [&>span:first-child]:h-11 [&>span:first-child]:bg-transparent',
    '[&>span:first-child]:overflow-visible',
    '[&>span:first-child]:after:pointer-events-none',
    '[&>span:first-child]:after:absolute [&>span:first-child]:after:left-0 [&>span:first-child]:after:right-0',
    '[&>span:first-child]:after:top-1/2 [&>span:first-child]:after:h-1 [&>span:first-child]:after:-translate-y-1/2',
    '[&>span:first-child]:after:rounded-full',
    '[&>span:first-child]:after:bg-[linear-gradient(to_right,hsl(var(--primary))_var(--scrub-fill-stop,0%),hsl(var(--primary)/0.2)_var(--scrub-fill-stop,0%))]',
    '[&>span:first-child]:after:origin-center [&>span:first-child]:after:transition-transform',
    '[&>span:first-child]:after:duration-150 [&>span:first-child]:after:ease-out',
    '[&>span:first-child]:after:content-[""] motion-reduce:[&>span:first-child]:after:transition-none',
    '[&>span:first-child>span]:top-1/2 [&>span:first-child>span]:h-1 [&>span:first-child>span]:-translate-y-1/2',
    '[&>span:first-child>span]:bg-transparent',
    // Tall row for touch; narrow width so min/max sit on the rail ends
    '[&_[role=slider]]:flex [&_[role=slider]]:h-11 [&_[role=slider]]:w-3.5',
    '[&_[role=slider]]:items-center [&_[role=slider]]:justify-center',
    '[&_[role=slider]]:border-0 [&_[role=slider]]:bg-transparent [&_[role=slider]]:shadow-none',
    '[&_[role=slider]]:after:block [&_[role=slider]]:after:size-3.5',
    '[&_[role=slider]]:after:rounded-full [&_[role=slider]]:after:border-2',
    '[&_[role=slider]]:after:border-background [&_[role=slider]]:after:bg-primary',
    '[&_[role=slider]]:after:shadow-md [&_[role=slider]]:after:content-[""]',
    '[&_[role=slider]]:transition-[transform,opacity]',
    '[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:[&_[role=slider]]:opacity-0',
    '[@media(hover:hover)]:group-hover/scrub:[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:group-focus-within/scrub:[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:group-hover/scrub:[&>span:first-child]:after:scale-y-[1.5]',
);

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
    const [scrubTime, setScrubTime] = useState(displayTime);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isTrackPressed, setIsTrackPressed] = useState(false);
    const [sliderKey, setSliderKey] = useState(0);
    const prevDisplayTimeRef = useRef(displayTime);

    useEffect(() => {
        if (!isScrubbing) {
            setScrubTime(Math.min(displayTime, max));
        }
    }, [displayTime, isScrubbing, max]);

    useEffect(() => {
        const prev = prevDisplayTimeRef.current;
        if (!isScrubbing && displayTime < prev - 2) {
            setSliderKey((k) => k + 1);
        }
        prevDisplayTimeRef.current = displayTime;
    }, [displayTime, isScrubbing]);

    const shownTime = isScrubbing ? scrubTime : Math.min(displayTime, max);
    const scrubRatio = shownTime / max;
    const isAtStart = shownTime <= 0;
    const isAtEnd = shownTime >= max;
    const scrubFillStop = isAtStart ? '0%' : isAtEnd ? '100%' : getScrubThumbCenter(scrubRatio);
    const scrubThumbCenter = isAtStart ? '0%' : isAtEnd ? '100%' : getScrubThumbCenter(scrubRatio);
    const isTrackExpanded = isScrubbing || isTrackPressed;

    const handleValueChange = (value: number[]) => {
        setIsScrubbing(true);
        setScrubTime(Math.min(max, Math.max(0, value[0] ?? 0)));
    };

    const handleValueCommit = (value: number[]) => {
        const next = Math.min(max, Math.max(0, value[0] ?? 0));
        setIsScrubbing(false);
        setIsTrackPressed(false);
        setScrubTime(next);
        onSeek(next);
    };

    const releaseTrackPress = () => {
        setIsTrackPressed(false);
    };

    const handleTrackPointerDown = () => {
        if (!disabled) {
            setIsTrackPressed(true);
        }
    };

    return (
        <div
            className={cn('relative w-full select-none', className)}
            style={
                {
                    '--scrub-fill-stop': scrubFillStop,
                    '--scrub-thumb-center': scrubThumbCenter,
                } as CSSProperties
            }
        >
            {isScrubbing ? (
                <div
                    className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium tabular-nums text-background shadow-md"
                    style={{ left: 'var(--scrub-thumb-center)' }}
                    aria-hidden
                >
                    {formatPlaybackSeconds(scrubTime)}
                </div>
            ) : null}

            <div
                className={cn(
                    'px-0.5',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                    isScrubbing && 'cursor-grabbing',
                )}
                onPointerDown={handleTrackPointerDown}
                onPointerUp={releaseTrackPress}
                onPointerCancel={releaseTrackPress}
                onLostPointerCapture={releaseTrackPress}
            >
                <Slider
                    key={sliderKey}
                    min={0}
                    max={max}
                    step={1}
                    disabled={disabled}
                    value={[shownTime]}
                    onValueChange={handleValueChange}
                    onValueCommit={handleValueCommit}
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
                        isAtStart &&
                            '[&_[role=slider]]:!left-0 [&_[role=slider]]:!translate-x-0',
                        isAtEnd &&
                            '[&_[role=slider]]:!left-auto [&_[role=slider]]:!right-0 [&_[role=slider]]:!translate-x-0',
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
