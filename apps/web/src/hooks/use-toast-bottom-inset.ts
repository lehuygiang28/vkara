'use client';

import { useEffect } from 'react';

const NOW_PLAYING_HEIGHT = '4.25rem';

/**
 * Sets --vkara-now-playing-height for bottom chrome (action popover, scroll padding).
 * Toasts render at the top; this hook does not position toasts.
 */
export function useToastBottomInset(hasNowPlayingBar: boolean) {
    useEffect(() => {
        document.documentElement.style.setProperty(
            '--vkara-now-playing-height',
            hasNowPlayingBar ? NOW_PLAYING_HEIGHT : '0rem',
        );

        return () => {
            document.documentElement.style.setProperty('--vkara-now-playing-height', '0rem');
        };
    }, [hasNowPlayingBar]);
}
