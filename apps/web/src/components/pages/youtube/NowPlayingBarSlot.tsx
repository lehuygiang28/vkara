'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { nowPlayingBarTransitions } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

const NowPlayingAnimatingContext = createContext(false);

export function useNowPlayingAnimating() {
    return useContext(NowPlayingAnimatingContext);
}

interface NowPlayingBarSlotProps {
    open: boolean;
    children: ReactNode;
    className?: string;
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

/**
 * Floating now-playing strip above bottom nav (out of document flow).
 * Transform-only slide — tab content height stays fixed while animating.
 */
export function NowPlayingBarSlot({
    open,
    children,
    className,
    onAnimationComplete,
}: NowPlayingBarSlotProps) {
    const reduceMotion = useReducedMotion();
    const [animating, setAnimating] = useState(false);

    const handleAnimationStart = useCallback(() => {
        setAnimating(true);
    }, []);

    const handleAnimationComplete = useCallback(() => {
        setAnimating(false);
        onAnimationComplete?.(open);
    }, [onAnimationComplete, open]);

    return (
        <NowPlayingAnimatingContext.Provider value={animating}>
            <div
                className={cn(
                    'pointer-events-none absolute bottom-full left-0 right-0 z-20',
                    className,
                )}
                aria-hidden={!open}
            >
                <div className="overflow-hidden [contain:layout_style_paint]">
                    <motion.div
                        data-vkara-now-playing-panel=""
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
        </NowPlayingAnimatingContext.Provider>
    );
}
