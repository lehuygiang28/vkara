'use client';

import { ReactNode, useEffect, type RefObject } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';

import { cn } from '@/lib/utils';

type TvSpatialOverlayShellProps = {
    focusKey: string;
    preferredChildFocusKey?: string;
    /** When set, pressing this direction closes the overlay (e.g. `up` for bottom panels). */
    dismissDirection?: 'up' | 'down' | 'left' | 'right';
    onDismissAction?: () => void;
    /** Keep focus inside overlay (settings). Uses focus boundary — does not pause spatial nav. */
    trapFocus?: boolean;
    onMountFocus?: boolean;
    className?: string;
    children: ReactNode;
    'aria-label'?: string;
    /** Optional ref to the shell root (e.g. settings scroll container). */
    containerRef?: RefObject<HTMLDivElement | null>;
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
    containerRef,
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
        if (!onMountFocus) {
            return;
        }

        focusSelf();

        if (!preferredChildFocusKey) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    setFocus(preferredChildFocusKey);
                } catch {
                    // Spatial tree may not be ready on first paint.
                }
            });
        });

        return () => cancelAnimationFrame(frame);
        // Seed focus once when overlay mounts.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onMountFocus]);

    const setRef = (node: HTMLDivElement | null) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (containerRef) {
            containerRef.current = node;
        }
    };

    return (
        <FocusContext.Provider value={overlayFocusKey}>
            <div ref={setRef} className={cn(className)} aria-label={ariaLabel}>
                {children}
            </div>
        </FocusContext.Provider>
    );
}
