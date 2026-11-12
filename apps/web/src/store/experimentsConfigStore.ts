import { create } from 'zustand';

import { apiGet } from '@/services/client/api-client';

type ExperimentsConfigStatus = 'idle' | 'loading' | 'ready' | 'error';

type ExperimentsConfigState = {
    status: ExperimentsConfigStatus;
    experimentsEnabled: boolean;
    fetchExperimentsConfig: () => Promise<void>;
};

export const useExperimentsConfigStore = create<ExperimentsConfigState>((set, get) => ({
    status: 'idle',
    experimentsEnabled: false,
    fetchExperimentsConfig: async () => {
        if (get().status === 'loading' || get().status === 'ready') {
            return;
        }
        set({ status: 'loading' });
        try {
            const config = await apiGet<{ experimentsEnabled: boolean }>('/config');
            set({
                status: 'ready',
                experimentsEnabled: config.experimentsEnabled === true,
            });
        } catch {
            set({ status: 'error', experimentsEnabled: false });
        }
    },
}));
