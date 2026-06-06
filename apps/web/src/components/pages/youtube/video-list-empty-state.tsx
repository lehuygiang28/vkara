'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type VideoListEmptyAction = {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
    icon?: ReactNode;
};

type VideoListEmptyStateProps = {
    icon?: ReactNode;
    title: string;
    description?: string;
    actions?: VideoListEmptyAction[];
    /** `compact` keeps room for content below on mobile browse surfaces. */
    density?: 'default' | 'compact';
    className?: string;
};

/** Centered empty list with optional guidance and next-step actions. */
export function VideoListEmptyState({
    icon,
    title,
    description,
    actions = [],
    density = 'default',
    className,
}: VideoListEmptyStateProps) {
    const isCompact = density === 'compact';

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center px-safe-offset text-center',
                isCompact
                    ? 'min-h-0 flex-none py-6'
                    : 'min-h-[40%] flex-1 py-12',
                className,
            )}
        >
            {icon ? (
                <div
                    className={cn(
                        'flex items-center justify-center rounded-xl border border-border/60 bg-muted/40',
                        isCompact ? 'mb-4 h-12 w-12' : 'mb-5 h-14 w-14',
                    )}
                    aria-hidden
                >
                    {icon}
                </div>
            ) : null}

            <p
                className={cn(
                    'max-w-sm font-medium tracking-tight text-foreground',
                    isCompact ? 'text-sm' : 'text-base',
                )}
            >
                {title}
            </p>

            {description ? (
                <p
                    className={cn(
                        'mt-2 max-w-xs leading-relaxed text-muted-foreground',
                        isCompact ? 'text-xs' : 'text-sm',
                    )}
                >
                    {description}
                </p>
            ) : null}

            {actions.length > 0 ? (
                <div className={cn('flex w-full max-w-xs flex-col gap-2', isCompact ? 'mt-4' : 'mt-6')}>
                    {actions.map((action) => (
                        <Button
                            key={action.label}
                            type="button"
                            variant={action.variant ?? 'default'}
                            className="h-10 w-full touch-manipulation"
                            onClick={action.onClick}
                        >
                            {action.icon}
                            {action.label}
                        </Button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
