/** Lazy chunk entry points for layout-aware prefetch (fire-and-forget). */

export function prefetchPlayerColumn(): void {
    void import('@/components/pages/youtube/PlayerColumn');
}

export function prefetchRemoteShell(): void {
    void import('@/components/pages/youtube/RemoteShell');
}

export function prefetchPlayerControlsTabs(): void {
    void import('@/components/pages/youtube/PlayerControlsTabs');
}

export function prefetchLayoutChunksForMode(
    mode: 'remote' | 'player' | 'both',
): void {
    if (mode === 'remote') {
        prefetchRemoteShell();
        return;
    }
    if (mode === 'player') {
        prefetchPlayerColumn();
        return;
    }
    prefetchPlayerColumn();
    prefetchRemoteShell();
}
