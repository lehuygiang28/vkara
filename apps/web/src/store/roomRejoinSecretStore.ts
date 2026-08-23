import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createMigratingPersistStorage, PERSIST_STORE_KEYS } from '@/lib/persisted-storage';

function normalizePassword(password?: string | null): string | undefined {
    const trimmed = password?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

type RoomRejoinSecretState = {
    secrets: Record<string, string>;
    pendingPassword?: string;
    stashPendingPassword: (password?: string | null) => void;
    commitPassword: (roomId: string) => void;
    forgetPassword: (roomId?: string | null) => void;
    resolvePassword: (roomId?: string | null) => string | undefined;
    resetForTests: () => void;
};

export const useRoomRejoinSecretStore = create<RoomRejoinSecretState>()(
    persist(
        (set, get) => ({
            secrets: {},
            pendingPassword: undefined,

            stashPendingPassword: (password) =>
                set({ pendingPassword: normalizePassword(password) }),

            commitPassword: (roomId) => {
                const normalizedRoomId = roomId?.trim();
                if (!normalizedRoomId) return;

                const password = get().pendingPassword;
                if (!password) {
                    set({ pendingPassword: undefined });
                    return;
                }

                set((state) => ({
                    pendingPassword: undefined,
                    secrets: { ...state.secrets, [normalizedRoomId]: password },
                }));
            },

            forgetPassword: (roomId) => {
                const normalizedRoomId = roomId?.trim();
                set((state) => {
                    if (!normalizedRoomId || !(normalizedRoomId in state.secrets)) {
                        return { pendingPassword: undefined };
                    }
                    const nextSecrets = { ...state.secrets };
                    delete nextSecrets[normalizedRoomId];
                    return { pendingPassword: undefined, secrets: nextSecrets };
                });
            },

            resolvePassword: (roomId) => {
                const normalizedRoomId = roomId?.trim();
                const { secrets, pendingPassword } = get();
                if (!normalizedRoomId) return pendingPassword;
                return secrets[normalizedRoomId] ?? pendingPassword;
            },

            resetForTests: () => {
                set({ secrets: {}, pendingPassword: undefined });
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(PERSIST_STORE_KEYS.rejoinSecrets);
                }
            },
        }),
        {
            name: PERSIST_STORE_KEYS.rejoinSecrets,
            version: 1,
            migrate: (persisted) => persisted as RoomRejoinSecretState,
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({ secrets: state.secrets }),
        },
    ),
);

export function selectRejoinPassword(roomId?: string | null) {
    return (state: RoomRejoinSecretState) => {
        const normalizedRoomId = roomId?.trim();
        if (!normalizedRoomId) return state.pendingPassword;
        return state.secrets[normalizedRoomId] ?? state.pendingPassword;
    };
}
