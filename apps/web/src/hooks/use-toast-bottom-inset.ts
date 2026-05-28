'use client';

import { useEffect } from 'react';

const NOW_PLAYING_HEIGHT = '4.25rem';

/**
 * Lifts fixed toasts above MobileBottomNav + optional NowPlayingBar on remote layout.
 * Resets when the shell unmounts (e.g. TV player-only view).
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
