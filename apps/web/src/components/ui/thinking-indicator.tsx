'use client';

import { forwardRef, useState, useEffect, type HTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { fontWeights } from '@/lib/font-weight';

const circleA =
    'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z';

const infinity =
    'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z';

const circleB =
    'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z';

const DEFAULT_MESSAGES = ['Thinking', 'Moonwalking', 'Planning', 'Refining'];

export interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
    messages?: string[];
    cycleIntervalMs?: number;
    active?: boolean;
    ariaLabel?: string;
}

const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
    (
        {
            className,
            messages = DEFAULT_MESSAGES,
            cycleIntervalMs = 4000,
            active = false,
            ariaLabel,
            ...props
        },
        ref,
    ) => {
        const labels = messages.length > 0 ? messages : DEFAULT_MESSAGES;
        const shouldCycle = labels.length > 1;
        const [index, setIndex] = useState(0);

        useEffect(() => {
            if (!shouldCycle) {
                return;
            }

            const interval = setInterval(() => {
                setIndex((i) => (i + 1) % labels.length);
            }, cycleIntervalMs);

            return () => clearInterval(interval);
        }, [shouldCycle, labels.length, cycleIntervalMs]);

        const currentLabel = labels[shouldCycle ? index : 0] ?? labels[0];
        const widthAnchor = labels.reduce((a, b) => (a.length >= b.length ? a : b));
        const accessibleStatus = ariaLabel ? `${ariaLabel}: ${currentLabel}` : currentLabel;

        return (
            <div
                ref={ref}
                role="status"
                aria-live={shouldCycle ? 'polite' : undefined}
                aria-atomic="true"
                className={cn('flex items-center gap-2 px-3 py-2', className)}
                {...props}
            >
                <motion.svg
                    aria-hidden
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                        'shrink-0 transition-colors duration-300',
                        active ? 'text-primary' : 'text-muted-foreground',
                    )}
                >
                    <motion.path
                        animate={{
                            d: [circleA, infinity, circleB, infinity, circleA],
                        }}
                        transition={{
                            d: {
                                duration: active ? 4 : 6,
                                ease: 'easeInOut',
                                repeat: Infinity,
                                times: [0, 0.25, 0.5, 0.75, 1.0],
                            },
                        }}
                    />
                </motion.svg>
                <span
                    className="inline-grid overflow-hidden text-[13px]"
                    style={{ fontVariationSettings: fontWeights.medium }}
                >
                    <span
                        className="invisible col-start-1 row-start-1 shimmer-text"
                        aria-hidden="true"
                    >
                        {widthAnchor}
                    </span>
                    {shouldCycle ? (
                        <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                                key={currentLabel}
                                className="col-start-1 row-start-1 shimmer-text"
                                initial={{ y: '80%', opacity: 0 }}
                                animate={{
                                    y: 0,
                                    opacity: 1,
                                    transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
                                }}
                                exit={{
                                    y: '-80%',
                                    opacity: 0,
                                    transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
                                }}
                            >
                                {currentLabel}
                            </motion.span>
                        </AnimatePresence>
                    ) : (
                        <span className="col-start-1 row-start-1 shimmer-text">{currentLabel}</span>
                    )}
                </span>
                {ariaLabel ? <span className="sr-only">{accessibleStatus}</span> : null}
            </div>
        );
    },
);

ThinkingIndicator.displayName = 'ThinkingIndicator';

export { ThinkingIndicator };
export default ThinkingIndicator;
