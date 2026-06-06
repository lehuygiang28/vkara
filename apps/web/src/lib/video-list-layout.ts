/** Shared row geometry for virtualized lists and skeleton loading states. */

export const VIDEO_LIST_ROW_HEIGHT = 100;
/** Gap between rows (`pb-1` on virtual rows, `space-y-1` on skeleton stacks). */
export const VIDEO_LIST_ROW_GAP = 4;
export const VIDEO_LIST_ROW_STRIDE = VIDEO_LIST_ROW_HEIGHT + VIDEO_LIST_ROW_GAP;

/** Default skeleton rows to approximate one mobile list viewport. */
export const VIDEO_LIST_SKELETON_PAGE_ROWS = 8;

/** Half-page fallback for load-more footers (pairs with viewportFraction 0.5). */
export const VIDEO_LIST_SKELETON_LOAD_MORE_ROWS = Math.max(
    2,
    Math.ceil(VIDEO_LIST_SKELETON_PAGE_ROWS * 0.5),
);

/** Total block height for N skeleton rows (matches `space-y-1` + fixed row height). */
export function getVideoListStackHeight(rowCount: number): number {
    if (rowCount <= 0) return 0;
    return rowCount * VIDEO_LIST_ROW_STRIDE - VIDEO_LIST_ROW_GAP;
}

/** @deprecated Use {@link getVideoListStackHeight}. */
export const getVideoListSkeletonBlockHeight = getVideoListStackHeight;

export function measureVideoListSkeletonRows(
    clientHeight: number,
    {
        viewportFraction = 1,
        minRows = 3,
    }: {
        viewportFraction?: number;
        minRows?: number;
    } = {},
): number {
    const targetHeight = clientHeight * viewportFraction;
    return Math.max(minRows, Math.ceil(targetHeight / VIDEO_LIST_ROW_STRIDE));
}
