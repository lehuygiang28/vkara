import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { YouTubeVideo } from '@vkara/youtube';

import { useCabinetStore } from '@/store/cabinetStore';

function createMemoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (key) => map.get(key) ?? null,
        key: (index) => [...map.keys()][index] ?? null,
        removeItem: (key) => {
            map.delete(key);
        },
        setItem: (key, value) => {
            map.set(key, value);
        },
    };
}

function video(id: string): YouTubeVideo {
    return {
        id,
        title: id,
        duration: 180,
        duration_formatted: '3:00',
        type: 'video',
        url: `https://www.youtube.com/watch?v=${id}`,
        uploadedAt: '',
        views: 0,
        channels: [{ name: 'Channel', verified: false }],
        thumbnails: [],
    };
}

describe('useCabinetStore', () => {
    const storage = createMemoryStorage();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal('localStorage', storage);
        useCabinetStore.setState({ videos: [] });
    });

    it('saves a song and removes it on the second toggle', () => {
        useCabinetStore.getState().toggle(video('a'));
        useCabinetStore.getState().toggle(video('b'));
        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['b', 'a']);

        useCabinetStore.getState().toggle(video('b'));
        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['a']);
    });

    it('clears the cabinet', () => {
        useCabinetStore.getState().toggle(video('a'));
        useCabinetStore.getState().clear();
        expect(useCabinetStore.getState().videos).toEqual([]);
    });

    it('drops a corrupt persisted entry on hydrate', async () => {
        storage.setItem(
            'vkara-cabinet',
            JSON.stringify({
                state: {
                    videos: [{ id: 'kept', title: 'Kept' }, { title: 'no id' }, { id: 'kept', title: 'dup' }],
                },
                version: 1,
            }),
        );

        await useCabinetStore.persist.rehydrate();

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['kept']);
    });
});
