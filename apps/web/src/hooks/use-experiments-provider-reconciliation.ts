'use client';

import { useEffect } from 'react';

import { reconcileVideoProviderWithExperiments } from '@/lib/reconcile-experiments-provider';
import { useExperimentsConfigStore } from '@/store/experimentsConfigStore';

/** Fetch API config, then reconcile provider when experiments deploy flag is known. */
export function useExperimentsProviderReconciliation(): void {
    const status = useExperimentsConfigStore((state) => state.status);
    const experimentsEnabled = useExperimentsConfigStore((state) => state.experimentsEnabled);

    useEffect(() => {
        void useExperimentsConfigStore.getState().fetchExperimentsConfig();
    }, []);

    useEffect(() => {
        if (status === 'ready' || status === 'error') {
            reconcileVideoProviderWithExperiments();
        }
    }, [status, experimentsEnabled]);
}
