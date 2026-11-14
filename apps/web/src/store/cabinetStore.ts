import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { YouTubeVideo } from '@vkara/youtube';

import {
    applyCabinetWrite,
    cabinetSaveEvictedOldest,
    parseCabinetVideos,
    type CabinetWrite,
} from '@/lib/cabinet';
import { createMigratingPersistStorage, readClientPersistItem } from '@/lib/persisted-storage';

export const CABINET_STORAGE_KEY = 'vkara-cabinet';

type CabinetState = {
    videos: YouTubeVideo[];
    savedIds: ReadonlySet<string>;
    toggle: (video: YouTubeVideo) => boolean;
    clear: () => void;
};

function readPersistedCabinet(): YouTubeVideo[] | null {
    const raw = readClientPersistItem(CABINET_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        const envelope: unknown = JSON.parse(raw);
        const videos =
            envelope && typeof envelope === 'object' && 'state' in envelope
                ? (envelope as { state?: { videos?: unknown } }).state?.videos
                : undefined;
        return parseCabinetVideos(videos);
    } catch {
        return null;
    }
}

function writeIsSettled(videos: readonly YouTubeVideo[], videoId: string, write: CabinetWrite): boolean {
    const has = videos.some((item) => item.id === videoId);
    return write === 'add' ? has : !has;
}

function indexedCabinet(videos: YouTubeVideo[]): Pick<CabinetState, 'videos' | 'savedIds'> {
    return {
        videos,
        savedIds: new Set(videos.map((video) => video.id)),
    };
}

export const useCabinetStore = create(
    persist<CabinetState>(
        (set, get) => ({
            ...indexedCabinet([]),
            toggle: (video) => {
                const write: CabinetWrite = get().savedIds.has(video.id) ? 'remove' : 'add';
                let base = readPersistedCabinet() ?? get().videos;
                let next = applyCabinetWrite(base, video, write);
                const evicted = cabinetSaveEvictedOldest(base, next, video.id);
                set(indexedCabinet(next));

                for (let attempt = 0; attempt < 3; attempt += 1) {
                    const persisted = readPersistedCabinet();
                    if (!persisted || writeIsSettled(persisted, video.id, write)) {
                        break;
                    }
                    base = persisted;
                    next = applyCabinetWrite(base, video, write);
                    set(indexedCabinet(next));
                }

                return evicted;
            },
            clear: () => {
                set(indexedCabinet([]));
            },
        }),
        {
            name: CABINET_STORAGE_KEY,
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

function sameCabinetOrder(left: readonly YouTubeVideo[], right: readonly YouTubeVideo[]): boolean {
    return left.length === right.length && left.every((video, index) => video.id === right[index]?.id);
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== CABINET_STORAGE_KEY) {
            return;
        }
        let primary: string | null = null;
        try {
            primary = localStorage.getItem(CABINET_STORAGE_KEY);
        } catch {
            return;
        }
        const videos = event.newValue || primary ? readPersistedCabinet() ?? [] : [];
        const current = useCabinetStore.getState().videos;
        if (sameCabinetOrder(current, videos)) {
            return;
        }
        useCabinetStore.setState(indexedCabinet(videos));
    });
}
