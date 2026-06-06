'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type VideoListToolbarProps = {
    /** Primary actions (e.g. import, shuffle) — aligned start. */
    leading?: ReactNode;
    /** Secondary/destructive actions (e.g. clear) — aligned end. */
    trailing?: ReactNode;
    className?: string;
};

/** Queue/history header: start actions vs end actions on opposite sides. */
export function VideoListToolbar({ leading, trailing, className }: VideoListToolbarProps) {
    return (
        <div
            className={cn(
                'shrink-0 border-b bg-background/95 px-page-gutter pb-2.5 pt-safe-offset backdrop-blur supports-[backdrop-filter]:bg-background/80',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-2">
                {leading ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">{leading}</div>
                ) : (
                    <div className="min-w-0 flex-1" />
                )}
                {trailing ? (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {trailing}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
