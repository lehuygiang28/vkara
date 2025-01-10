import { Skeleton } from '@/components/ui/skeleton';

export function VideoSkeleton() {
    return (
        <div className="flex gap-3 items-start">
            <Skeleton className="h-20 w-32 rounded-md flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-8 w-24" />
            </div>
        </div>
    );
}
