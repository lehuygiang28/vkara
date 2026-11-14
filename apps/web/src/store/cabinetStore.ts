import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { YouTubeVideo } from '@vkara/youtube';

import { parseCabinetVideos, toggleCabinetVideo } from '@/lib/cabinet';
import { createMigratingPersistStorage } from '@/lib/persisted-storage';

type CabinetState = {
    videos: YouTubeVideo[];
    toggle: (video: YouTubeVideo) => void;
    clear: () => void;
};

export const useCabinetStore = create(
    persist<CabinetState>(
        (set) => ({
            videos: [],
            toggle: (video) => {
                set((state) => ({ videos: toggleCabinetVideo(state.videos, video) }));
            },
            clear: () => {
                set({ videos: [] });
            },
        }),
        {
            name: 'vkara-cabinet',
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({ videos: state.videos }) as CabinetState,
            merge: (persisted, current) => ({
                ...current,
                videos: parseCabinetVideos(
                    persisted && typeof persisted === 'object' && 'videos' in persisted
                        ? persisted.videos
                        : undefined,
                ),
            }),
        },
    ),
);
