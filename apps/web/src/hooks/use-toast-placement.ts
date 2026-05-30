'use client';

import { useSyncExternalStore } from 'react';

import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';

function subscribeCoarsePointer(callback: () => void) {
    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getCoarsePointerSnapshot() {
    return window.matchMedia('(pointer: coarse)').matches;
}

function getCoarsePointerServerSnapshot() {
    return true;
}

/**
 * Bottom placement on touch / remote — avoids the top connection banner and sits above bottom nav.
 */
export function useToastPlacement() {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const isCoarsePointer = useSyncExternalStore(
        subscribeCoarsePointer,
        getCoarsePointerSnapshot,
        getCoarsePointerServerSnapshot,
    );

    const preferBottom = effectiveLayoutMode === 'remote' || isCoarsePointer;

    if (preferBottom) {
        return {
            position: 'bottom-center' as const,
            offset: {
                bottom: 'var(--vkara-toast-bottom)',
                left: 'max(var(--safe-left), 0.75rem)',
                right: 'max(var(--safe-right), 0.75rem)',
            },
            swipeDirections: ['left', 'right', 'bottom'] as const,
        };
    }

    return {
        position: 'top-center' as const,
        offset: {
            top: 'var(--vkara-toast-top)',
            left: 'max(var(--safe-left), 0.75rem)',
            right: 'max(var(--safe-right), 0.75rem)',
        },
        swipeDirections: ['left', 'right', 'top'] as const,
    };
}
