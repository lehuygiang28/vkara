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

/** True when transient feedback should anchor above bottom chrome (remote / touch). */
export function usePreferBottomChrome() {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const isCoarsePointer = useSyncExternalStore(
        subscribeCoarsePointer,
        getCoarsePointerSnapshot,
        getCoarsePointerServerSnapshot,
    );

    return effectiveLayoutMode === 'remote' || isCoarsePointer;
}
