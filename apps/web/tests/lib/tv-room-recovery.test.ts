import { ErrorCode } from '@vkara/room';
import { createTestPersistedRoom } from '@vkara/room/test-fixtures';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    buildTvRecoveryCreateRoomMessage,
    captureTvRoomSnapshot,
    isTvLayoutMode,
    shouldRecoverTvRoom,
} from '@/lib/tv-room-recovery';
import { useRoomRejoinSecretStore } from '@/store/roomRejoinSecretStore';

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

function installBrowserStorage(): void {
    const storage = createMapStorage();
    globalThis.localStorage = storage;
    globalThis.window = { localStorage: storage } as Window & typeof globalThis;
}

function uninstallBrowserStorage(): void {
    // @ts-expect-error test cleanup
    delete globalThis.window;
    // @ts-expect-error test cleanup
    delete globalThis.localStorage;
}

beforeEach(() => {
    installBrowserStorage();
});

afterEach(() => {
    useRoomRejoinSecretStore.getState().resetForTests();
    uninstallBrowserStorage();
});

describe('tv-room-recovery', () => {
    it('captures snapshot with previous room id', () => {
        const secrets = useRoomRejoinSecretStore.getState();
        secrets.stashPendingPassword('secret');
        secrets.commitPassword('5678');
        const snapshot = captureTvRoomSnapshot(
            createTestPersistedRoom({
                id: '5678',
                hasPassword: true,
                videoQueue: [{ id: 'a' } as never],
                historyQueue: [{ id: 'h' } as never],
                volume: 70,
                autoPlayNext: true,
            }),
        );

        expect(snapshot?.previousRoomId).toBe('5678');
        expect(snapshot?.password).toBe('secret');
        expect(snapshot?.restore.videoQueue).toHaveLength(1);
        expect(snapshot?.restore.autoPlayNext).toBe(true);
        expect(buildTvRecoveryCreateRoomMessage(snapshot!).preferredRoomId).toBe('5678');
        expect(buildTvRecoveryCreateRoomMessage(snapshot!).password).toBe('secret');
    });

    it('shouldRecoverTvRoom only for TV layout', () => {
        expect(shouldRecoverTvRoom('errorWithCode', ErrorCode.REJOIN_ROOM_NOT_FOUND, true)).toBe(
            true,
        );
        expect(shouldRecoverTvRoom('errorWithCode', ErrorCode.REJOIN_ROOM_NOT_FOUND, false)).toBe(
            false,
        );
        expect(shouldRecoverTvRoom('roomClosed', undefined, true)).toBe(false);
    });

    it('does not recover for unrelated error codes on TV', () => {
        expect(shouldRecoverTvRoom('errorWithCode', ErrorCode.INCORRECT_PASSWORD, true)).toBe(
            false,
        );
        expect(shouldRecoverTvRoom('roomUpdate', undefined, true)).toBe(false);
    });

    it('returns null snapshot for invalid room', () => {
        expect(captureTvRoomSnapshot(null)).toBeNull();
        expect(captureTvRoomSnapshot({ id: '' } as never)).toBeNull();
    });

    it('isTvLayoutMode treats non-remote as TV', () => {
        expect(isTvLayoutMode('player')).toBe(true);
        expect(isTvLayoutMode('remote')).toBe(false);
    });
});
