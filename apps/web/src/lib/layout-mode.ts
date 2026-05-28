import type { LayoutModeSource, YouTubeStoreLayoutMode } from '@/store/youtubeStore';

/** Large screens act as TV (video only); phones/tablets act as remotes. */
export const TV_MIN_WIDTH_PX = 1024;

export function getSuggestedLayoutMode(width: number): YouTubeStoreLayoutMode {
    if (width >= TV_MIN_WIDTH_PX) {
        return 'player';
    }
    return 'remote';
}

export function getEffectiveLayoutMode({
    storedLayoutMode,
    layoutModeSource,
    viewportWidth,
}: {
    storedLayoutMode: YouTubeStoreLayoutMode;
    layoutModeSource: LayoutModeSource;
    viewportWidth: number;
}): YouTubeStoreLayoutMode {
    if (layoutModeSource === 'user') {
        return storedLayoutMode;
    }

    if (viewportWidth > 0) {
        return getSuggestedLayoutMode(viewportWidth);
    }

    return storedLayoutMode;
}
