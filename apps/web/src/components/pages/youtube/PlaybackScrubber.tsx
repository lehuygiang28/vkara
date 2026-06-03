'use client';

import { useEffect, useState } from 'react';

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

/** Visual rail thickens via transform; track element stays tall for real hit-testing. */
const SCRUB_TRACK_EXPANDED_CLASS = '[&>span:first-child]:after:scale-y-[1.5]';

const SCRUB_SLIDER_CLASS = cn(
    'group/scrub relative h-11 w-full',
    'cursor-pointer touch-none select-none',
    // Tall track = full-width draggable surface (Radix hit-tests this element)
    '[&>span:first-child]:relative [&>span:first-child]:h-11 [&>span:first-child]:bg-transparent',
    '[&>span:first-child]:overflow-visible',
    // Thin visible rail (decorative; pointer events stay on the track)
    '[&>span:first-child]:after:pointer-events-none',
    '[&>span:first-child]:after:absolute [&>span:first-child]:after:left-0 [&>span:first-child]:after:right-0',
    '[&>span:first-child]:after:top-1/2 [&>span:first-child]:after:h-1 [&>span:first-child]:after:-translate-y-1/2',
    '[&>span:first-child]:after:rounded-full [&>span:first-child]:after:bg-primary/20',
    '[&>span:first-child]:after:origin-center [&>span:first-child]:after:transition-transform',
    '[&>span:first-child]:after:duration-150 [&>span:first-child]:after:ease-out',
    '[&>span:first-child]:after:content-[""] motion-reduce:[&>span:first-child]:after:transition-none',
    // Filled range — same thin strip, vertically centered
    '[&>span:first-child>span]:top-1/2 [&>span:first-child>span]:h-1 [&>span:first-child>span]:-translate-y-1/2',
    '[&>span:first-child>span]:bg-primary',
    // Thumb: large hit target, small visible knob
    '[&_[role=slider]]:flex [&_[role=slider]]:h-11 [&_[role=slider]]:w-11',
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

    useEffect(() => {
        if (!isScrubbing) {
            setScrubTime(Math.min(displayTime, max));
        }
    }, [displayTime, isScrubbing, max]);

    const shownTime = isScrubbing ? scrubTime : Math.min(displayTime, max);
    const thumbPercent = Math.min(100, Math.max(0, (shownTime / max) * 100));
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
        <div className={cn('relative w-full select-none', className)}>
            {isScrubbing ? (
                <div
                    className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs font-medium tabular-nums text-background shadow-md"
                    style={{ left: `${thumbPercent}%` }}
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
