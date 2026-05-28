import type { LayoutModeSource, YouTubeStoreLayoutMode } from '@/store/youtubeStore';

/** Large screens act as TV (video only); phones/tablets act as remotes. */
export const TV_MIN_WIDTH_PX = 1024;

export function getSuggestedLayoutMode(width: number): YouTubeStoreLayoutMode {
    if (width >= TV_MIN_WIDTH_PX) {
        return 'player';
    }
    return 'remote';
}

function isExplicitLayoutParam(
    layoutParam: string | null,
): layoutParam is YouTubeStoreLayoutMode {
    return layoutParam === 'both' || layoutParam === 'remote' || layoutParam === 'player';
}

export function getEffectiveLayoutMode({
    storedLayoutMode,
    layoutModeSource,
    layoutParam,
    viewportWidth,
}: {
    storedLayoutMode: YouTubeStoreLayoutMode;
    layoutModeSource: LayoutModeSource;
    layoutParam: string | null;
    viewportWidth: number;
}): YouTubeStoreLayoutMode {
    if (isExplicitLayoutParam(layoutParam)) {
        return layoutParam;
    }

    if (layoutModeSource === 'user') {
        return storedLayoutMode;
    }

    if (viewportWidth > 0) {
        return getSuggestedLayoutMode(viewportWidth);
    }

    return storedLayoutMode;
}
