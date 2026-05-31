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

    useEffect(() => {
        if (!isScrubbing) {
            setScrubTime(Math.min(displayTime, max));
        }
    }, [displayTime, isScrubbing, max]);

    const shownTime = isScrubbing ? scrubTime : Math.min(displayTime, max);
    const thumbPercent = Math.min(100, Math.max(0, (shownTime / max) * 100));

    const handleValueChange = (value: number[]) => {
        setIsScrubbing(true);
        setScrubTime(Math.min(max, Math.max(0, value[0] ?? 0)));
    };

    const handleValueCommit = (value: number[]) => {
        const next = Math.min(max, Math.max(0, value[0] ?? 0));
        setIsScrubbing(false);
        setScrubTime(next);
        onSeek(next);
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
                    'touch-none px-0.5 py-4',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                )}
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
                        'group/scrub relative w-full',
                        !disabled && 'cursor-pointer',
                        isScrubbing && 'cursor-grabbing',
                        '[&>span:first-child]:h-1 [&>span:first-child]:transition-[height]',
                        (isScrubbing || !disabled) &&
                            '[&>span:first-child]:group-hover/scrub:h-1.5',
                        isScrubbing && '[&>span:first-child]:h-1.5',
                        '[&>span:first-child>span]:bg-primary',
                        '[&_[role=slider]]:size-3.5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-background',
                        '[&_[role=slider]]:bg-primary [&_[role=slider]]:shadow-md',
                        '[&_[role=slider]]:transition-[transform,opacity]',
                        '[&_[role=slider]]:opacity-100',
                        '[@media(hover:hover)]:[&_[role=slider]]:opacity-0',
                        '[@media(hover:hover)]:group-hover/scrub:[&_[role=slider]]:opacity-100',
                        '[@media(hover:hover)]:group-focus-within/scrub:[&_[role=slider]]:opacity-100',
                        isScrubbing && '[&_[role=slider]]:scale-125 [&_[role=slider]]:opacity-100',
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
