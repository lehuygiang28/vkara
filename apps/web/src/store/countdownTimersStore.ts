import { create } from 'zustand';

/** Countdown before auto-advancing to the next queued video on the TV player. */
export const NEXT_VIDEO_COUNTDOWN_SECONDS = 5;

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
    initialSeconds: NEXT_VIDEO_COUNTDOWN_SECONDS,

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
