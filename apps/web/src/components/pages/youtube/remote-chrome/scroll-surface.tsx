'use client';

import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react';

import { ScrollToTopListButton } from '@/components/scroll-to-top-list';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';
import { cn } from '@/lib/utils';

import { RemoteScrollRoot } from './scroll-root';

export type RemoteScrollSurfaceProps = {
    children: ReactNode;
    className?: string;
    scrollRootClassName?: string;
    scrollTopLabel: string;
    /** Extra visibility gate (e.g. hide while a row action menu is open). */
    showScrollTopButton?: boolean;
    onBeforeScrollToTop?: () => void;
    /** Called when the scroll root mounts; use for pull-to-refresh or virtualizer refs. */
    onScrollRef?: (node: HTMLDivElement | null) => void;
} & Omit<ComponentProps<'div'>, 'children'>;

/**
 * Scroll container with remote chrome inset and an optional scroll-to-top control.
 */
export function RemoteScrollSurface({
    children,
    className,
    scrollRootClassName,
    scrollTopLabel,
    showScrollTopButton,
    onBeforeScrollToTop,
    onScrollRef,
    ...surfaceProps
}: RemoteScrollSurfaceProps) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
    const { showScrollTop, scrollToTop } = useScrollToTop(scrollElement, scrollRef, {
        onBeforeScroll: onBeforeScrollToTop,
    });

    const assignScrollRef = useCallback(
        (node: HTMLDivElement | null) => {
            scrollRef.current = node;
            setScrollElement(node);
            onScrollRef?.(node);
        },
        [onScrollRef],
    );

    const isScrollTopVisible = showScrollTop && (showScrollTopButton ?? true);

    return (
        <div
            className={cn(
                'relative isolate flex min-h-0 flex-1 flex-col overflow-hidden',
                className,
            )}
            {...surfaceProps}
        >
            <RemoteScrollRoot
                ref={assignScrollRef}
                className={cn('min-h-0 flex-1', scrollRootClassName)}
            >
                {children}
            </RemoteScrollRoot>
            <ScrollToTopListButton
                show={isScrollTopVisible}
                onClick={scrollToTop}
                label={scrollTopLabel}
            />
        </div>
    );
}
