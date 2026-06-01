import { cn } from '@/lib/utils';

type LiveBadgeProps = {
    className?: string;
};

export function LiveBadge({ className }: LiveBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-white',
                className,
            )}
        >
            <span
                className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white"
                aria-hidden
            />
            LIVE
        </span>
    );
}
