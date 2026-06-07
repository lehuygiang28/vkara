'use client';

import { useCallback } from 'react';

import { prefetchPlayerColumn, prefetchRemoteShell } from '@/hooks/use-layout-chunk-prefetch';
import { prefetchLayoutChunksForMode } from '@/lib/layout-chunk-prefetch';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';
import { useYouTubeStore } from '@/store/youtubeStore';

export type LayoutModeChoice = 'auto' | YouTubeStoreLayoutMode;

export function useLayoutModeChange() {
    const layoutMode = useYouTubeStore((s) => s.layoutMode);
    const layoutModeSource = useYouTubeStore((s) => s.layoutModeSource);
    const setLayoutMode = useYouTubeStore((s) => s.setLayoutMode);
    const enableAutoLayoutMode = useYouTubeStore((s) => s.enableAutoLayoutMode);
    const setCurrentTab = useYouTubeStore((s) => s.setCurrentTab);

    const selectedChoice: LayoutModeChoice = layoutModeSource === 'auto' ? 'auto' : layoutMode;

    const changeLayoutMode = useCallback(
        (choice: LayoutModeChoice) => {
            if (choice === selectedChoice) {
                return;
            }
            if (choice === 'auto') {
                enableAutoLayoutMode();
                setCurrentTab('search');
                return;
            }
            if (choice === 'remote' || choice === 'both') {
                prefetchRemoteShell();
            }
            if (choice === 'player' || choice === 'both') {
                prefetchPlayerColumn();
            }
            if (choice === 'both') {
                prefetchLayoutChunksForMode('both');
            }
            setLayoutMode(choice, 'user');
            if (choice === 'remote' || choice === 'both') {
                setCurrentTab('search');
            } else if (choice === 'player') {
                setCurrentTab('queue');
            }
        },
        [selectedChoice, enableAutoLayoutMode, setCurrentTab, setLayoutMode],
    );

    return { selectedChoice, changeLayoutMode, layoutModeSource };
}
