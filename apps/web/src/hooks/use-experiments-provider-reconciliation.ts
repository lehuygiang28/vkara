'use client';

import { useEffect } from 'react';

import { reconcileVideoProviderWithExperiments } from '@/lib/reconcile-experiments-provider';

/** On load, move users off TikTok when deploy experiments flag is off (Settings UI hidden). */
export function useExperimentsProviderReconciliation(): void {
    useEffect(() => {
        reconcileVideoProviderWithExperiments();
    }, []);
}
