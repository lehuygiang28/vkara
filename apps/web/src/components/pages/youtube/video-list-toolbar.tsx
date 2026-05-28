'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type VideoListToolbarProps = {
    children: ReactNode;
    /** Icon-only or secondary action pinned to the right (e.g. import playlist). */
    trailing?: ReactNode;
    className?: string;
};

/** Queue/history header: primary actions on the left, optional trailing control on the right. */
export function VideoListToolbar({ children, trailing, className }: VideoListToolbarProps) {
    return (
        <div
            className={cn(
                'shrink-0 border-b bg-background/95 px-safe-offset pb-2.5 pt-safe-offset backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className,
            )}
        >
            <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
                {trailing ? <div className="shrink-0">{trailing}</div> : null}
            </div>
        </div>
    );
}
