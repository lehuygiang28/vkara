import { forwardRef, type ComponentProps } from 'react';

import { REMOTE_CHROME_CSS_VARS } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

/** Scroll-end gap above the floating now-playing bar (height from synced CSS var). */
export function RemoteScrollInsetSpacer({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn('pointer-events-none w-full shrink-0', className)}
            style={{ height: `var(${REMOTE_CHROME_CSS_VARS.insetBottom}, 0px)` }}
        />
    );
}

/**
 * Scroll container for remote tabs/overlays.
 * Always appends {@link RemoteScrollInsetSpacer} so content clears the now-playing bar.
 */
export const RemoteScrollRoot = forwardRef<HTMLDivElement, ComponentProps<'div'>>(
    function RemoteScrollRoot({ className, children, ...props }, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    'min-h-0 touch-manipulation overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]',
                    className,
                )}
                {...props}
            >
                {children}
                <RemoteScrollInsetSpacer />
            </div>
        );
    },
);
