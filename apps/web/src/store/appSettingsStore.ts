import type { VideoSource } from '@vkara/youtube';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createMigratingPersistStorage } from '@/lib/persisted-storage';
import { isExperimentsEnabled } from '@/lib/experiments';

interface AppSettingsState {
    useWhisperVoiceSearch: boolean;
    videoProvider: VideoSource;
    setUseWhisperVoiceSearch: (enabled: boolean) => void;
    setVideoProvider: (provider: VideoSource) => void;
    getEffectiveVideoProvider: () => VideoSource;
}

export const useAppSettingsStore = create<AppSettingsState>()(
    persist(
        (set, get) => ({
            useWhisperVoiceSearch: false,
            videoProvider: 'youtube',
            setUseWhisperVoiceSearch: (enabled) => set({ useWhisperVoiceSearch: enabled }),
            setVideoProvider: (provider) => {
                if (provider === 'tiktok' && !isExperimentsEnabled()) {
                    set({ videoProvider: 'youtube' });
                    return;
                }
                set({ videoProvider: provider });
            },
            getEffectiveVideoProvider: () => {
                if (!isExperimentsEnabled()) {
                    return 'youtube';
                }
                return get().videoProvider;
            },
        }),
        {
            name: 'vkara-app-settings',
            version: 2,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({
                useWhisperVoiceSearch: state.useWhisperVoiceSearch,
                videoProvider: state.videoProvider,
            }),
            migrate: (persisted, version) => {
                const state = persisted as Partial<AppSettingsState>;
                if (version < 2) {
                    return {
                        ...state,
                        videoProvider: state.videoProvider ?? 'youtube',
                    } as AppSettingsState;
                }
                return persisted as AppSettingsState;
            },
        },
    ),
);
