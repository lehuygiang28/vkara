import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useYouTubeStore } from '@/store/youtubeStore';

function createMapStorage(): Storage {
    const map = new Map<string, string>();
    return {
        get length() {
            return map.size;
        },
        clear() {
            map.clear();
        },
        getItem(key: string) {
            return map.get(key) ?? null;
        },
        key(index: number) {
            return [...map.keys()][index] ?? null;
        },
        removeItem(key: string) {
            map.delete(key);
        },
        setItem(key: string, value: string) {
            map.set(key, value);
        },
    } as Storage;
}

describe('youtubeStore persist partialize', () => {
    const storage = createMapStorage();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal('localStorage', storage);

        useYouTubeStore.setState({
            room: {
                id: 'ROOM42',
                password: 'pw',
                hasPassword: true,
                videoQueue: [],
                historyQueue: [],
                volume: 80,
                playingNow: null,
                isPlaying: true,
                currentTime: 123,
                lastActivity: Date.now(),
                creatorId: 'c1',
                locked: false,
                showQRInPlayer: true,
                captionsEnabled: false,
                captionsLanguage: 'en',
                captionTracks: [],
                captionTracksVideoId: null,
                tiktokPhotoIndex: 0,
                tiktokPhotoMaxIndex: 0,
                participants: {},
                hostDeviceId: 'h1',
            },
            volume: 55,
            currentTab: 'search',
            layoutMode: 'player',
            layoutModeSource: 'user',
            player: null,
            tvSuppressAutoCreate: true,
            tvLobbyBanner: { title: 'x', description: 'y' },
        });

        // Ensure hot fields are present in memory even if typed defaults cleared them.
        useYouTubeStore.setState((state) => ({
            room: state.room
                ? {
                      ...state.room,
                      currentTime: 123,
                      isPlaying: true,
                      playingNow: { id: 'now' } as never,
                      videoQueue: [{ id: 'v1' } as never],
                  }
                : null,
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('persists room id and omits hot playback fields', () => {
        const persistApi = (
            useYouTubeStore as unknown as {
                persist: {
                    getOptions: () => {
                        partialize: (state: ReturnType<typeof useYouTubeStore.getState>) => unknown;
                    };
                };
            }
        ).persist;

        const partial = persistApi.getOptions().partialize(useYouTubeStore.getState()) as {
            room: Record<string, unknown> | null;
            volume: number;
            tvSuppressAutoCreate: boolean;
            tvLobbyBanner: unknown;
            player: unknown;
        };

        expect(partial.room?.id).toBe('ROOM42');
        expect(partial.room?.password).toBe('pw');
        expect(partial.volume).toBe(55);
        expect(partial.tvSuppressAutoCreate).toBe(false);
        expect(partial.tvLobbyBanner).toBeNull();
        expect(partial.player).toBeNull();
        expect(partial.room?.currentTime).toBe(0);
        expect(partial.room?.isPlaying).toBe(false);
        expect(partial.room?.videoQueue).toEqual([]);
        expect(partial.room?.playingNow).toBeNull();
    });
});
