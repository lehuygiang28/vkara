'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { forwardRef, useCallback, type ReactNode } from 'react';

import { nowPlayingBarTransitions, REMOTE_CHROME_Z_INDEX } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

import { useNowPlayingAnimating } from './remote-chrome';

interface NowPlayingBarSlotProps {
    open: boolean;
    children: ReactNode;
    className?: string;
    onAnimatingChange?: (animating: boolean) => void;
    /** Fired when a slide animation finishes; `open` is the target visibility. */
    onAnimationComplete?: (open: boolean) => void;
}

const panelVariants = {
    open: {
        y: 0,
        transition: nowPlayingBarTransitions.open,
    },
    closed: {
        y: '100%',
        transition: nowPlayingBarTransitions.close,
    },
} as const;

/** Floating now-playing strip above bottom nav (transform-only slide). */
export const NowPlayingBarSlot = forwardRef<HTMLDivElement, NowPlayingBarSlotProps>(
    function NowPlayingBarSlot(
        { open, children, className, onAnimatingChange, onAnimationComplete },
        ref,
    ) {
        const reduceMotion = useReducedMotion();
        const animating = useNowPlayingAnimating();

        const handleAnimationStart = useCallback(() => {
            onAnimatingChange?.(true);
        }, [onAnimatingChange]);

        const handleAnimationComplete = useCallback(() => {
            onAnimatingChange?.(false);
            onAnimationComplete?.(open);
        }, [onAnimatingChange, onAnimationComplete, open]);

        return (
            <div
                className={cn('pointer-events-none absolute bottom-full left-0 right-0', className)}
                style={{ zIndex: REMOTE_CHROME_Z_INDEX.nowPlayingBar }}
                aria-hidden={!open}
            >
                <div className="overflow-hidden [contain:layout_style_paint]">
                    <motion.div
                        ref={ref}
                        initial={false}
                        animate={open ? 'open' : 'closed'}
                        variants={panelVariants}
                        transition={reduceMotion ? { duration: 0 } : undefined}
                        onAnimationStart={handleAnimationStart}
                        onAnimationComplete={handleAnimationComplete}
                        style={{ transform: 'translateZ(0)' }}
                        className={cn(
                            open ? 'pointer-events-auto' : 'pointer-events-none',
                            animating && 'will-change-transform',
                        )}
                    >
                        {children}
                    </motion.div>
                </div>
            </div>
        );
    },
);
