import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createMigratingPersistStorage } from '@/lib/persisted-storage';

interface AppSettingsState {
    useWhisperVoiceSearch: boolean;
    setUseWhisperVoiceSearch: (enabled: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
    persist(
        (set) => ({
            useWhisperVoiceSearch: false,
            setUseWhisperVoiceSearch: (enabled) => set({ useWhisperVoiceSearch: enabled }),
        }),
        {
            name: 'vkara-app-settings',
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({ useWhisperVoiceSearch: state.useWhisperVoiceSearch }),
        },
    ),
);
