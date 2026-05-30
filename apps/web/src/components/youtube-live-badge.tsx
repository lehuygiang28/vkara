import { cn } from '@/lib/utils';

type LiveBadgeProps = {
    className?: string;
    /** Thumbnail overlay (default) or inline next to metadata. */
    variant?: 'overlay' | 'inline';
};

export function LiveBadge({ className, variant = 'overlay' }: LiveBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded font-bold uppercase tracking-wide text-white',
                variant === 'overlay'
                    ? 'bg-red-600 px-1.5 py-0.5 text-[10px] leading-none'
                    : 'bg-red-600/90 px-1.5 py-0.5 text-[10px] leading-none',
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
