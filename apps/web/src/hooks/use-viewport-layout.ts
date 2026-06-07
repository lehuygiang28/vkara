'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import { getEffectiveLayoutMode, getSuggestedLayoutMode, TV_MIN_WIDTH_PX } from '@/lib/layout-mode';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';
import { useYouTubeStore } from '@/store/youtubeStore';

const VIEWPORT_UNKNOWN = -1;

function subscribeViewport(callback: () => void) {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
}

function getViewportWidthSnapshot(): number {
    return window.innerWidth;
}

function getViewportWidthServerSnapshot(): number {
    return VIEWPORT_UNKNOWN;
}

export type SuggestedLayoutMode = YouTubeStoreLayoutMode;

/**
 * Subscribes to viewport width without a post-paint useEffect measure (avoids layout flicker).
 */
export function useViewportWidth() {
    return useSyncExternalStore(
        subscribeViewport,
        getViewportWidthSnapshot,
        getViewportWidthServerSnapshot,
    );
}

/**
 * Resolves TV vs remote layout from viewport + user overrides, and syncs Zustand before paint.
 */
export function useEffectiveLayoutMode() {
    const viewportWidth = useViewportWidth();
    const storedLayoutMode = useYouTubeStore((s) => s.layoutMode);
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);
    const applyAutoLayoutMode = useYouTubeStore((s) => s.applyAutoLayoutMode);

    const isViewportReady = viewportWidth > 0;

    const effectiveLayoutMode = useMemo(
        () =>
            getEffectiveLayoutMode({
                storedLayoutMode,
                layoutModeSource,
                viewportWidth,
            }),
        [storedLayoutMode, layoutModeSource, viewportWidth],
    );

    const suggestedLayoutMode = useMemo(
        () => (isViewportReady ? getSuggestedLayoutMode(viewportWidth) : null),
        [isViewportReady, viewportWidth],
    );

    useLayoutEffect(() => {
        if (layoutModeSource !== 'auto' || !isViewportReady || !suggestedLayoutMode) {
            return;
        }
        if (storedLayoutMode !== suggestedLayoutMode) {
            applyAutoLayoutMode(suggestedLayoutMode);
        }
    }, [
        layoutModeSource,
        isViewportReady,
        suggestedLayoutMode,
        storedLayoutMode,
        applyAutoLayoutMode,
    ]);

    return {
        viewportWidth,
        isViewportReady,
        effectiveLayoutMode,
        suggestedLayoutMode,
        isTvViewport: effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both',
        isRemoteViewport: effectiveLayoutMode === 'remote',
        tvBreakpointPx: TV_MIN_WIDTH_PX,
        needsLayoutBootstrap: !isViewportReady && layoutModeSource === 'auto',
    };
}
