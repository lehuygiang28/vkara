'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface RemoteTabKeepAliveProps {
    active: boolean;
    keepMounted: boolean;
    children: ReactNode;
    className?: string;
}

/**
 * Keeps tab content mounted while hidden to avoid remount jank on tab switches.
 */
export function RemoteTabKeepAlive({
    active,
    keepMounted,
    children,
    className,
}: RemoteTabKeepAliveProps) {
    if (!keepMounted) {
        return null;
    }

    return (
        <div className={cn(active ? className : 'hidden')} aria-hidden={!active}>
            {children}
        </div>
    );
}
