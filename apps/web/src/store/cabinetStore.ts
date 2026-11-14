import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { YouTubeVideo } from '@vkara/youtube';

import { parseCabinetVideos, toggleCabinetVideo } from '@/lib/cabinet';
import { createMigratingPersistStorage } from '@/lib/persisted-storage';

type CabinetState = {
    videos: YouTubeVideo[];
    savedIds: ReadonlySet<string>;
    toggle: (video: YouTubeVideo) => void;
    clear: () => void;
};

function indexedCabinet(videos: YouTubeVideo[]): Pick<CabinetState, 'videos' | 'savedIds'> {
    return {
        videos,
        savedIds: new Set(videos.map((video) => video.id)),
    };
}

export const useCabinetStore = create(
    persist<CabinetState>(
        (set) => ({
            ...indexedCabinet([]),
            toggle: (video) => {
                set((state) => indexedCabinet(toggleCabinetVideo(state.videos, video)));
            },
            clear: () => {
                set(indexedCabinet([]));
            },
        }),
        {
            name: 'vkara-cabinet',
            version: 1,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({ videos: state.videos }) as CabinetState,
            merge: (persisted, current) => ({
                ...current,
                ...indexedCabinet(
                    parseCabinetVideos(
                        persisted && typeof persisted === 'object' && 'videos' in persisted
                            ? persisted.videos
                            : undefined,
                    ),
                ),
            }),
        },
    ),
);
