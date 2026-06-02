'use client';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const MIN_ICON_SIZE = 20;
const MAX_ICON_SIZE = 44;
const MIN_GAP_FOR_ICON = 16;
const ICON_VERTICAL_PADDING = 4;

type VideoListPullHeaderProps = {
    pullPosition: number;
    isRefreshing: boolean;
    holdGap: number;
    refreshThreshold: number;
    maxPullGap: number;
};

/** Extra pull beyond threshold adds less visual height so the gap does not balloon. */
function displayGap(
    pullPosition: number,
    refreshThreshold: number,
    maxPullGap: number,
): number {
    if (pullPosition <= refreshThreshold) return pullPosition;
    const extra = pullPosition - refreshThreshold;
    const maxExtra = Math.max(maxPullGap - refreshThreshold, 1);
    const dampenedExtra = extra * (0.35 + 0.65 * (1 - extra / maxExtra));
    return Math.round(refreshThreshold + dampenedExtra);
}

function iconSizeForGap(gap: number, refreshThreshold: number): number {
    if (gap < MIN_GAP_FOR_ICON) return 0;
    const maxFit = Math.max(0, gap - ICON_VERTICAL_PADDING);
    const ratio = Math.min(1, gap / Math.max(refreshThreshold, 1));
    const target = Math.round(MIN_ICON_SIZE + ratio * (MAX_ICON_SIZE - MIN_ICON_SIZE));
    return Math.min(target, maxFit);
}

function pullRotationDeg(pullPosition: number, refreshThreshold: number): number {
    const progress = Math.min(1, pullPosition / Math.max(refreshThreshold, 1));
    return Math.round(progress * 300);
}

/** Reserves space above the list; spinner scales and stays centered in the pull gap. */
export function VideoListPullHeader({
    pullPosition,
    isRefreshing,
    holdGap,
    refreshThreshold,
    maxPullGap,
}: VideoListPullHeaderProps) {
    const gap = isRefreshing
        ? holdGap
        : displayGap(pullPosition, refreshThreshold, maxPullGap);
    const isDragging = pullPosition > 0 && !isRefreshing;
    const iconSize = iconSizeForGap(gap, refreshThreshold);
    const showIcon = iconSize > 0;
    const pullRotation =
        isDragging && pullPosition > 0 ? pullRotationDeg(pullPosition, refreshThreshold) : 0;

    return (
        <div
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden',
                !isDragging &&
                    'transition-[height] duration-200 ease-out motion-reduce:transition-none',
            )}
            style={{ height: gap }}
            aria-live="polite"
            aria-busy={isRefreshing}
            aria-label={isRefreshing ? 'Refreshing' : undefined}
        >
            {showIcon ? (
                <div
                    className={cn(
                        'flex shrink-0 items-center justify-center',
                        !isDragging &&
                            'transition-[width,height] duration-200 ease-out motion-reduce:transition-none',
                    )}
                    style={{
                        width: iconSize,
                        height: iconSize,
                        transform:
                            pullRotation > 0 ? `rotate(${pullRotation}deg)` : undefined,
                    }}
                >
                    <Loader2
                        className={cn(
                            'size-full text-muted-foreground',
                            isRefreshing && 'animate-spin motion-reduce:animate-none',
                        )}
                        aria-hidden
                    />
                </div>
            ) : null}
        </div>
    );
}
