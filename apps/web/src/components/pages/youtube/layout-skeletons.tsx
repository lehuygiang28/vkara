import { cn } from '@/lib/utils';

export function PlayerColumnSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn('relative h-full w-full bg-background', className)} aria-hidden>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />
        </div>
    );
}

export function RemoteShellSkeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn('flex h-full min-h-0 flex-col gap-3 p-3', className)}
            aria-busy="true"
            aria-hidden
        >
            <div className="h-10 animate-pulse rounded-lg bg-muted/40" />
            <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-muted/25" />
            <div className="h-14 animate-pulse rounded-lg bg-muted/35" />
        </div>
    );
}
