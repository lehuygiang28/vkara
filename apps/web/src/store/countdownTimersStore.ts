import { create } from 'zustand';

interface CountdownStore {
    isActive: boolean;
    remainingSeconds: number;
    isCancelled: boolean;
    shouldShowTimer: boolean;
    initialSeconds: number;
    onComplete?: () => void;
    startCountdown: (seconds: number) => void;
    cancelCountdown: () => void;
    completeCountdown: () => void;
    setRemainingSeconds: (updater: number | ((prev: number) => number)) => void;
    setShouldShowTimer: (show: boolean) => void;
    setOnComplete: (callback: () => void) => void;
    reset: () => void;
}

export const useCountdownStore = create<CountdownStore>((set, get) => ({
    isActive: false,
    remainingSeconds: 0,
    isCancelled: false,
    shouldShowTimer: false,
    initialSeconds: 5,
    onComplete: undefined,

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
        const state = get();
        if (state.isActive) {
            set({
                isActive: false,
                isCancelled: true,
                remainingSeconds: 0,
                shouldShowTimer: false,
            });
        }
    },

    completeCountdown: () => {
        const state = get();
        if (state.onComplete && !state.isCancelled) {
            state.onComplete();
        }
        set({
            isActive: false,
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

    setOnComplete: (callback) => set({ onComplete: callback }),

    reset: () =>
        set({
            isActive: false,
            remainingSeconds: 0,
            isCancelled: false,
            shouldShowTimer: false,
            onComplete: undefined,
        }),
}));
