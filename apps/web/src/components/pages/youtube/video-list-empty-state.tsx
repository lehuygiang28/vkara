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
    className?: string;
};

/** Centered empty list with optional guidance and next-step actions. */
export function VideoListEmptyState({
    icon,
    title,
    description,
    actions = [],
    className,
}: VideoListEmptyStateProps) {
    return (
        <div
            className={cn(
                'flex min-h-[40%] flex-1 flex-col items-center justify-center px-safe-offset py-12 text-center',
                className,
            )}
        >
            {icon ? (
                <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-muted/40"
                    aria-hidden
                >
                    {icon}
                </div>
            ) : null}

            <p className="max-w-sm text-base font-medium tracking-tight text-foreground">{title}</p>

            {description ? (
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {description}
                </p>
            ) : null}

            {actions.length > 0 ? (
                <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
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
