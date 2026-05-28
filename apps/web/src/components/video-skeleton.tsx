import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Mirrors `VideoList` row layout so loading state does not shift when data arrives. */
export function VideoSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'flex w-full items-start gap-3 rounded-lg p-2',
                className,
            )}
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
}

export function VideoSkeletonList({
    count = 4,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1 px-2 py-2', className)}>
            {Array.from({ length: count }, (_, i) => (
                <VideoSkeleton key={i} />
            ))}
        </div>
    );
}
