'use client';

import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type HorizontalScrollRailProps = ComponentProps<'div'> & {
    children: ReactNode;
};

/**
 * Touch-friendly horizontal scroller for nested mobile layouts (iOS / Android).
 * Allows both axis panning so vertical page scroll still works on the same gesture area.
 */
export function HorizontalScrollRail({ className, children, ...props }: HorizontalScrollRailProps) {
    return (
        <div
            role="list"
            className={cn(
                'flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain',
                'snap-x snap-proximity pl-page-gutter',
                'pb-1 pr-page-gutter [-ms-overflow-style:none] [-webkit-overflow-scrolling:touch]',
                '[scrollbar-width:none] [touch-action:pan-x_pan-y] [&::-webkit-scrollbar]:hidden',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
