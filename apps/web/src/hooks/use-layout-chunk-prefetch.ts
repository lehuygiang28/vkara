'use client';

import { useEffect } from 'react';

import {
    prefetchLayoutChunksForMode,
    prefetchPlayerColumn,
    prefetchRemoteShell,
} from '@/lib/layout-chunk-prefetch';
import { TV_MIN_WIDTH_PX } from '@/lib/layout-mode';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useYouTubeStore } from '@/store/youtubeStore';

const NEAR_TV_BREAKPOINT_MIN = TV_MIN_WIDTH_PX - 64;

/**
 * Prefetch lazy layout chunks before the user needs them (resize, mode change, TV settings).
 */
export function useLayoutChunkPrefetch(): void {
    const { effectiveLayoutMode, viewportWidth } = useEffectiveLayoutMode();
    const layoutMode = useYouTubeStore((s) => s.layoutMode);
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);

    useEffect(() => {
        if (layoutModeSource === 'user' && layoutMode === 'both') {
            prefetchLayoutChunksForMode('both');
        }
    }, [layoutMode, layoutModeSource]);

    useEffect(() => {
        if (viewportWidth <= 0) {
            return;
        }

        if (
            viewportWidth >= NEAR_TV_BREAKPOINT_MIN &&
            viewportWidth < TV_MIN_WIDTH_PX &&
            effectiveLayoutMode === 'remote'
        ) {
            prefetchPlayerColumn();
        }
    }, [effectiveLayoutMode, viewportWidth]);

    useEffect(() => {
        if (effectiveLayoutMode === 'player') {
            prefetchRemoteShell();
        }
    }, [effectiveLayoutMode]);
}

export { prefetchRemoteShell, prefetchPlayerColumn };
