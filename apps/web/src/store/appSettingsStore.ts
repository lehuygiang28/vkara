import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ useWhisperVoiceSearch: state.useWhisperVoiceSearch }),
        },
    ),
);
