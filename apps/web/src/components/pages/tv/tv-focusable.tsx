'use client';

import { ReactNode, useEffect, useRef, type RefObject } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import {
    useFocusable,
    type UseFocusableConfig,
} from '@noriginmedia/norigin-spatial-navigation-react';
import { cn } from '@/lib/utils';
import { scrollTvSettingsItemIntoView } from '@/lib/tv-settings-scroll';
import { tvDefaultFocusLeaf } from '@/lib/tv-focus-styles';

type TvFocusableProps<P = object> = {
    children: ReactNode | ((state: { focused: boolean }) => ReactNode);
    className?: string | ((state: { focused: boolean }) => string);
    focusKey?: string;
    onEnterPress?: UseFocusableConfig<P>['onEnterPress'];
    onArrowPress?: UseFocusableConfig<P>['onArrowPress'];
    onFocusAction?: () => void;
    focusOnMount?: boolean;
    disabled?: boolean;
    accessibilityLabel?: string;
    extraProps?: P;
    /** When true, scrolls the element into view on focus (settings lists). */
    scrollIntoViewOnFocus?: boolean;
    /** Scroll parent for settings rail (uses precise in-container scroll). */
    scrollContainerRef?: RefObject<HTMLElement | null>;
    /** Item supplies its own focus styling (queue shell, transport shell). */
    suppressFocusChrome?: boolean;
};

export function TvFocusable<P = object>({
    children,
    className,
    focusKey: propFocusKey,
    onEnterPress,
    onArrowPress,
    onFocusAction: onFocus,
    focusOnMount = false,
    disabled = false,
    accessibilityLabel,
    extraProps,
    scrollIntoViewOnFocus = false,
    scrollContainerRef,
    suppressFocusChrome = false,
}: TvFocusableProps<P>) {
    const mountedFocusRef = useRef(false);

    const { ref, focused, focusKey } = useFocusable<P>({
        focusKey: propFocusKey,
        focusable: !disabled,
        onEnterPress,
        onArrowPress,
        onFocus: () => {
            onFocus?.();
            if (!scrollIntoViewOnFocus) {
                return;
            }

            requestAnimationFrame(() => {
                const node = (ref as React.RefObject<HTMLDivElement | null>).current;
                const container = scrollContainerRef?.current ?? null;

                if (container && node) {
                    scrollTvSettingsItemIntoView(container, node);
                    return;
                }

                node?.scrollIntoView({
                    block: 'nearest',
                    behavior: 'smooth',
                });
            });
        },
        extraProps,
        accessibilityLabel,
    });

    useEffect(() => {
        if (!focusOnMount || disabled || mountedFocusRef.current) {
            return;
        }

        mountedFocusRef.current = true;

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    setFocus(focusKey);
                } catch {
                    // Focus tree may not be ready on first paint.
                }
            });
        });

        return () => cancelAnimationFrame(frame);
    }, [focusOnMount, disabled, focusKey]);

    const content = typeof children === 'function' ? children({ focused }) : children;
    const resolvedClassName = typeof className === 'function' ? className({ focused }) : className;

    return (
        <div
            ref={ref}
            data-focused={focused ? 'true' : 'false'}
            className={cn(
                'outline-none',
                !suppressFocusChrome && tvDefaultFocusLeaf(focused),
                disabled && !focused && 'opacity-35',
                resolvedClassName,
            )}
        >
            {content}
        </div>
    );
}
