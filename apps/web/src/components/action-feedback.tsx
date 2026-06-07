'use client';

import { AlertTriangle, Check, Info } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { usePreferBottomChrome } from '@/hooks/use-prefer-bottom-chrome';
import { cn } from '@/lib/utils';
import { useActionFeedbackStore, type ActionFeedbackVariant } from '@/store/action-feedback-store';

const toneStyles: Record<
    ActionFeedbackVariant,
    { border: string; iconWrap: string; badge: string }
> = {
    success: {
        border: 'border-emerald-500/50',
        iconWrap: 'border-emerald-400/70 bg-emerald-500 text-white',
        badge: 'bg-emerald-500/20 text-emerald-300',
    },
    info: {
        border: 'border-sky-500/50',
        iconWrap: 'border-sky-400/70 bg-sky-500 text-white',
        badge: 'bg-sky-500/20 text-sky-300',
    },
    warning: {
        border: 'border-amber-500/50',
        iconWrap: 'border-amber-400/70 bg-amber-500 text-zinc-950',
        badge: 'bg-amber-500/20 text-amber-200',
    },
};

function ActionFeedbackIcon({ variant }: { variant: ActionFeedbackVariant }) {
    const className = 'h-3.5 w-3.5 stroke-[2.75]';
    switch (variant) {
        case 'info':
            return <Info className={className} aria-hidden />;
        case 'warning':
            return <AlertTriangle className={className} aria-hidden />;
        default:
            return <Check className={className} aria-hidden />;
    }
}

function ActionFeedbackCard({ className }: { className?: string }) {
    const { title, description, variant, tick, repeatCount } = useActionFeedbackStore();
    const reduceMotion = useReducedMotion();
    const tone = toneStyles[variant];

    return (
        <motion.div
            key={tick}
            role="status"
            initial={reduceMotion ? false : { opacity: 0.55, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                'vkara-action-feedback flex w-full max-w-lg items-start gap-3 rounded-2xl border-2 px-3.5 py-2.5',
                'bg-zinc-900 text-white shadow-[0_12px_40px_rgb(0_0_0/0.65)]',
                tone.border,
                className,
            )}
        >
            <motion.span
                aria-hidden
                initial={reduceMotion ? false : { scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                    tone.iconWrap,
                )}
            >
                <ActionFeedbackIcon variant={variant} />
            </motion.span>
            <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex min-w-0 items-start gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-white">
                        {title}
                    </p>
                    {repeatCount > 1 ? (
                        <motion.span
                            key={repeatCount}
                            initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                                tone.badge,
                            )}
                        >
                            ×{repeatCount}
                        </motion.span>
                    ) : null}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                    {description ? (
                        <motion.p
                            key={`${tick}-${description}`}
                            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                            className="line-clamp-2 text-xs leading-snug text-zinc-400"
                        >
                            {description}
                        </motion.p>
                    ) : null}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

const hostTransition = cn(
    'transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]',
    'motion-reduce:transition-none motion-reduce:transform-none',
);

/** Global transient feedback — fixed layer, no layout shift. */
export function ActionFeedbackHost() {
    const visible = useActionFeedbackStore((s) => s.visible);
    const preferBottom = usePreferBottomChrome();

    return (
        <div
            aria-live="polite"
            aria-hidden={!visible}
            className={cn(
                'pointer-events-none fixed inset-x-0 z-[105] flex justify-center px-safe-offset',
                preferBottom
                    ? 'bottom-[var(--vkara-toast-bottom)]'
                    : 'top-[var(--vkara-toast-top)]',
                hostTransition,
                visible
                    ? 'translate-y-0 opacity-100'
                    : preferBottom
                      ? 'translate-y-1.5 opacity-0'
                      : '-translate-y-1.5 opacity-0',
            )}
        >
            {visible ? <ActionFeedbackCard className="pointer-events-auto" /> : null}
        </div>
    );
}
