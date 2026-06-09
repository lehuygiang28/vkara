'use client';

import { ReactNode, useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import { pause, resume } from '@noriginmedia/norigin-spatial-navigation-core';

import { cn } from '@/lib/utils';

type TvSpatialOverlayShellProps = {
    focusKey: string;
    preferredChildFocusKey?: string;
    /** When set, pressing this direction closes the overlay (e.g. `up` for bottom panels). */
    dismissDirection?: 'up' | 'down' | 'left' | 'right';
    onDismissAction?: () => void;
    /** Trap focus inside overlay (settings). Queue chrome allows vertical escape to control bar. */
    trapFocus?: boolean;
    onMountFocus?: boolean;
    className?: string;
    children: ReactNode;
    'aria-label'?: string;
};

export function TvSpatialOverlayShell({
    focusKey,
    preferredChildFocusKey,
    dismissDirection,
    onDismissAction,
    trapFocus = false,
    onMountFocus = true,
    className,
    children,
    'aria-label': ariaLabel,
}: TvSpatialOverlayShellProps) {
    const { ref, focusKey: overlayFocusKey, focusSelf } = useFocusable({
        focusKey,
        trackChildren: true,
        preferredChildFocusKey,
        focusable: false,
        isFocusBoundary: trapFocus,
        onArrowPress: (direction) => {
            if (dismissDirection && direction === dismissDirection && onDismissAction) {
                onDismissAction();
                return false;
            }
            return true;
        },
    });

    useEffect(() => {
        if (trapFocus) {
            pause();
        }
        if (onMountFocus) {
            focusSelf();
        }
        return () => {
            if (trapFocus) {
                resume();
            }
        };
    }, [trapFocus, onMountFocus, focusSelf]);

    return (
        <FocusContext.Provider value={overlayFocusKey}>
            <div ref={ref} className={cn(className)} aria-label={ariaLabel}>
                {children}
            </div>
        </FocusContext.Provider>
    );
}
