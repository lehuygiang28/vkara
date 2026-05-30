'use client';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const MIN_ICON_SIZE = 20;
const MAX_ICON_SIZE = 44;
const MIN_GAP_FOR_ICON = 16;

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
    const ratio = Math.min(1, gap / Math.max(refreshThreshold, 1));
    return Math.round(MIN_ICON_SIZE + ratio * (MAX_ICON_SIZE - MIN_ICON_SIZE));
}

function loaderTransform(pullPosition: number, isRefreshing: boolean): string {
    const center = 'translate(-50%, -50%)';
    if (isRefreshing || pullPosition <= 0) return center;
    return `${center} rotate(${Math.min(pullPosition * 2, 360)}deg)`;
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

    return (
        <div
            className={cn(
                'relative shrink-0 overflow-hidden',
                !isDragging &&
                    'transition-[height] duration-200 ease-out motion-reduce:transition-none',
            )}
            style={{ height: gap }}
            aria-live="polite"
            aria-busy={isRefreshing}
            aria-label={isRefreshing ? 'Refreshing' : undefined}
        >
            {showIcon ? (
                <Loader2
                    className={cn(
                        'absolute left-1/2 top-1/2 text-muted-foreground',
                        isRefreshing && 'animate-spin motion-reduce:animate-none',
                        !isDragging &&
                            'transition-[width,height] duration-200 ease-out motion-reduce:transition-none',
                    )}
                    style={{
                        width: iconSize,
                        height: iconSize,
                        transform: loaderTransform(pullPosition, isRefreshing),
                    }}
                    aria-hidden
                />
            ) : null}
        </div>
    );
}
