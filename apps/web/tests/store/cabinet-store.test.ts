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
        useCabinetStore.setState({ videos: [], savedIds: new Set() });
    });

    it('saves a song and removes it on the second toggle', () => {
        useCabinetStore.getState().toggle(video('a'));
        useCabinetStore.getState().toggle(video('b'));
        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['b', 'a']);
        expect(useCabinetStore.getState().savedIds.has('a')).toBe(true);
        expect(useCabinetStore.getState().savedIds.has('b')).toBe(true);

        useCabinetStore.getState().toggle(video('b'));
        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['a']);
        expect(useCabinetStore.getState().savedIds.has('b')).toBe(false);
    });

    it('clears the cabinet', () => {
        useCabinetStore.getState().toggle(video('a'));
        useCabinetStore.getState().clear();
        expect(useCabinetStore.getState().videos).toEqual([]);
        expect(useCabinetStore.getState().savedIds.size).toBe(0);
    });

    it('restores the cabinet from the backup when the stored json does not parse', () => {
        useCabinetStore.getState().toggle(video('b'));
        storage.setItem('vkara-cabinet', '{not json');

        useCabinetStore.getState().toggle(video('c'));

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['c', 'b']);
        expect(storage.getItem('vkara-cabinet.bad')).toBe('{not json');
        expect(storage.getItem('vkara-cabinet')).not.toBe('{not json');
    });

    it('keeps a song another tab wrote before this tab saves', () => {
        useCabinetStore.getState().toggle(video('a'));
        storage.setItem(
            'vkara-cabinet',
            JSON.stringify({
                state: { videos: [video('b')] },
                version: 1,
            }),
        );

        useCabinetStore.getState().toggle(video('c'));

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['c', 'b']);
    });

    it('removes from the list another tab already extended', () => {
        useCabinetStore.getState().toggle(video('a'));
        storage.setItem(
            'vkara-cabinet',
            JSON.stringify({
                state: { videos: [video('a'), video('b')] },
                version: 1,
            }),
        );

        useCabinetStore.getState().toggle(video('a'));

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['b']);
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
        expect(useCabinetStore.getState().savedIds.has('kept')).toBe(true);
        expect(useCabinetStore.getState().savedIds.size).toBe(1);
    });
});
