'use client';

import { memo, type RefObject } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { VIDEO_LIST_ROW_HEIGHT, VIDEO_LIST_SKELETON_PAGE_ROWS } from '@/lib/video-list-layout';
import { useVideoListSkeletonRows } from '@/hooks/use-video-list-skeleton-rows';
import { cn } from '@/lib/utils';

export { VIDEO_LIST_SKELETON_PAGE_ROWS } from '@/lib/video-list-layout';

/** Mirrors `VideoList` row layout so loading state does not shift when data arrives. */
export const VideoSkeleton = memo(function VideoSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn('flex w-full items-start gap-3 rounded-lg py-2', className)}
            style={{ height: VIDEO_LIST_ROW_HEIGHT }}
        >
            <Skeleton className="aspect-video w-24 shrink-0 rounded-md sm:w-32" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Skeleton className="h-3.5 w-full max-w-[96%] rounded-sm" />
                <Skeleton className="h-3.5 w-[72%] rounded-sm" />
                <Skeleton className="h-4 w-[55%] rounded-sm" />
                <Skeleton className="h-3 w-[38%] rounded-sm" />
            </div>
        </div>
    );
});

export const VideoSkeletonList = memo(function VideoSkeletonList({
    count = VIDEO_LIST_SKELETON_PAGE_ROWS,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1 py-2', className)}>
            {Array.from({ length: count }, (_, i) => (
                <VideoSkeleton key={i} />
            ))}
        </div>
    );
});

/** Fills the scroll viewport — pass the scroll container ref (e.g. `RemoteScrollRoot`). */
export const VideoSkeletonListForViewport = memo(function VideoSkeletonListForViewport({
    scrollRef,
    className,
    active = true,
}: {
    scrollRef: RefObject<HTMLElement | null>;
    className?: string;
    active?: boolean;
}) {
    const count = useVideoListSkeletonRows(scrollRef, active, {
        viewportFraction: 1,
        observe: true,
    });
    return <VideoSkeletonList count={count} className={className} />;
});
