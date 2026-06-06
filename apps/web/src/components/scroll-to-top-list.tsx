'use client';

import { ChevronUp } from 'lucide-react';

import { REMOTE_CHROME_CSS_VARS, REMOTE_CONTENT_INSET_GAP } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

interface ScrollToTopListButtonProps {
    show: boolean;
    onClick: () => void;
    label: string;
}

/** Floating control to jump to the top of a scrollable video list. */
export function ScrollToTopListButton({ show, onClick, label }: ScrollToTopListButtonProps) {
    if (!show) return null;

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            style={{
                bottom: `calc(var(${REMOTE_CHROME_CSS_VARS.insetBottom}, 0px) + ${REMOTE_CONTENT_INSET_GAP})`,
            }}
            className={cn(
                'absolute z-30 flex size-11 cursor-pointer items-center justify-center rounded-full',
                'border border-border/80 bg-background/92 text-foreground',
                'shadow-[0_2px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm',
                'right-page-gutter',
                'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
                'hover:bg-accent/80 active:scale-[0.96]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'animate-in fade-in-0 zoom-in-95 duration-200 motion-reduce:animate-none',
            )}
        >
            <ChevronUp className="size-5 shrink-0" strokeWidth={2} aria-hidden />
        </button>
    );
}
