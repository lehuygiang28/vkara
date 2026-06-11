'use client';

import { useEffect, useRef } from 'react';
import { seedTvFocus, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';

function blurEmbeddedFrameFocus() {
    const active = document.activeElement;
    if (active instanceof HTMLIFrameElement) {
        active.blur();
    }
}

type TvEmbedFocusGuardProps = {
    /** When true, pull focus back into spatial nav (overlay open). */
    controlsVisible: boolean;
};

/**
 * Prevents YouTube/TikTok iframes from stealing D-pad focus on TV.
 * Pair with pointer-events-none on embed surfaces.
 */
export function TvEmbedFocusGuard({ controlsVisible }: TvEmbedFocusGuardProps) {
    const wasControlsVisibleRef = useRef(false);

    useEffect(() => {
        blurEmbeddedFrameFocus();

        const becameVisible = controlsVisible && !wasControlsVisibleRef.current;
        wasControlsVisibleRef.current = controlsVisible;

        if (becameVisible) {
            seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
        }
    }, [controlsVisible]);

    useEffect(() => {
        const onFocusIn = (event: FocusEvent) => {
            if (event.target instanceof HTMLIFrameElement) {
                event.preventDefault();
                blurEmbeddedFrameFocus();
                if (controlsVisible) {
                    seedTvFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                }
            }
        };

        document.addEventListener('focusin', onFocusIn, true);
        return () => document.removeEventListener('focusin', onFocusIn, true);
    }, [controlsVisible]);

    return <div className="pointer-events-none absolute inset-0 z-[6]" aria-hidden tabIndex={-1} />;
}
