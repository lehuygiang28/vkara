import { create } from 'zustand';

interface CountdownStore {
    isActive: boolean;
    remainingSeconds: number;
    isCancelled: boolean;
    shouldShowTimer: boolean;
    initialSeconds: number;
    startCountdown: (seconds: number) => void;
    cancelCountdown: () => void;
    setRemainingSeconds: (updater: number | ((prev: number) => number)) => void;
    setShouldShowTimer: (show: boolean) => void;
    reset: () => void;
}

export const useCountdownStore = create<CountdownStore>((set, get) => ({
    isActive: false,
    remainingSeconds: 0,
    isCancelled: false,
    shouldShowTimer: false,
    initialSeconds: 5,

    startCountdown: (seconds) => {
        const state = get();
        if (!state.isActive) {
            set({
                isActive: true,
                remainingSeconds: seconds,
                isCancelled: false,
                shouldShowTimer: true,
                initialSeconds: seconds,
            });
        }
    },

    cancelCountdown: () => {
        set({
            isActive: false,
            isCancelled: true,
            remainingSeconds: 0,
            shouldShowTimer: false,
        });
    },

    setRemainingSeconds: (updater) => {
        const state = get();
        if (state.isActive) {
            const newValue =
                typeof updater === 'function' ? updater(state.remainingSeconds) : updater;
            set({ remainingSeconds: newValue });
        }
    },

    setShouldShowTimer: (show) => set({ shouldShowTimer: show }),

    reset: () =>
        set({
            isActive: false,
            remainingSeconds: 0,
            isCancelled: false,
            shouldShowTimer: false,
        }),
}));
