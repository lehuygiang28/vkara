import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import { PAGE_GUTTER } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

type RemotePageGutterProps<T extends ElementType = 'div'> = {
    as?: T;
    children: ReactNode;
    className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/** Horizontal page inset — apply once per chrome band or scroll body (inside `RemoteScrollRoot`).
 *  Do not apply on the same element as absolutely positioned virtual rows; wrap an inner
 *  relative container instead so row `translate3d` math stays viewport-aligned. */
export function RemotePageGutter<T extends ElementType = 'div'>({
    as,
    children,
    className,
    ...props
}: RemotePageGutterProps<T>) {
    const Component = as ?? 'div';

    return (
        <Component className={cn(PAGE_GUTTER.className, className)} {...props}>
            {children}
        </Component>
    );
}
