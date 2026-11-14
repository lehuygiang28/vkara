import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { YouTubeVideo } from '@vkara/youtube';

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

describe('cabinet storage events', () => {
    const storage = createMemoryStorage();
    const getItem = storage.getItem.bind(storage);
    const setItem = storage.setItem.bind(storage);
    const listeners = new Map<string, (event: StorageEvent) => void>();

    beforeEach(() => {
        storage.clear();
        storage.getItem = getItem;
        storage.setItem = setItem;
        listeners.clear();
        vi.resetModules();
        vi.stubGlobal('localStorage', storage);
        vi.stubGlobal('window', {
            addEventListener: (type: string, listener: (event: StorageEvent) => void) => {
                listeners.set(type, listener);
            },
        });
    });

    async function loadStore() {
        const store = await import('@/store/cabinetStore');
        return store.useCabinetStore;
    }

    function emit(key: string | null, newValue: string | null) {
        listeners.get('storage')?.({ key, newValue } as StorageEvent);
    }

    it('replaces the open cabinet when another tab writes a different list', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        storage.setItem(
            'vkara-cabinet',
            JSON.stringify({ state: { videos: [video('b')] }, version: 1 }),
        );

        emit('vkara-cabinet', storage.getItem('vkara-cabinet'));

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['b']);
        expect(useCabinetStore.getState().savedIds.has('b')).toBe(true);
    });

    it('leaves the cabinet as it is when the other tab wrote the same order', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        const savedIds = useCabinetStore.getState().savedIds;
        storage.setItem(
            'vkara-cabinet',
            JSON.stringify({ state: { videos: [video('a')] }, version: 1 }),
        );

        emit('vkara-cabinet', storage.getItem('vkara-cabinet'));

        expect(useCabinetStore.getState().savedIds).toBe(savedIds);
    });

    it('clears the cabinet when the other tab removes the key', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        storage.removeItem('vkara-cabinet');
        storage.removeItem('vkara-cabinet.bak');

        emit('vkara-cabinet', null);

        expect(useCabinetStore.getState().videos).toEqual([]);
    });

    it('leaves the open cabinet in memory when reading the primary key throws', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        const getItem = storage.getItem.bind(storage);
        storage.getItem = (key: string) => {
            if (key === 'vkara-cabinet') {
                throw new DOMException('The operation is insecure.', 'SecurityError');
            }
            return getItem(key);
        };

        emit('vkara-cabinet', null);

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['a']);
    });

    it('keeps the restored cabinet when a null event arrives after the key is written back', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });

        emit('vkara-cabinet', null);

        expect(useCabinetStore.getState().videos.map((item) => item.id)).toEqual(['a']);
    });

    it('ignores storage events for other keys', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        const savedIds = useCabinetStore.getState().savedIds;

        emit('youtube-storage', '{"state":{}}');

        expect(useCabinetStore.getState().savedIds).toBe(savedIds);
    });

    it('clears the cabinet when the other tab writes a value that does not parse', async () => {
        const useCabinetStore = await loadStore();
        useCabinetStore.setState({ videos: [video('a')], savedIds: new Set(['a']) });
        storage.setItem('vkara-cabinet', '{not json');
        storage.setItem('vkara-cabinet.bak', '{not json');

        emit('vkara-cabinet', '{not json');

        expect(useCabinetStore.getState().videos).toEqual([]);
    });
});
