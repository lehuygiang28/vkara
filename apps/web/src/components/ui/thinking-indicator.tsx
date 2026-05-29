'use client';

import { forwardRef, useState, useEffect, type HTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { fontWeights } from '@/lib/font-weight';

const DEFAULT_MESSAGES = ['Thinking', 'Moonwalking', 'Planning', 'Refining'];

export interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
    messages?: string[];
    cycleIntervalMs?: number;
    ariaLabel?: string;
}

const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
    (
        {
            className,
            messages = DEFAULT_MESSAGES,
            cycleIntervalMs = 4000,
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
                className={cn('px-3 py-2', className)}
                {...props}
            >
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
