import { create } from 'zustand';

/** Countdown before auto-advancing to the next queued video on the TV player. */
export const NEXT_VIDEO_COUNTDOWN_SECONDS = 5;

/**
 * Ring progress for discrete second ticks (N…1 then complete).
 * Maps N displayed values across N−1 intervals so the ring reaches 100% on the last second.
 */
export function getCountdownRingProgress(
    remainingSeconds: number,
    totalSeconds: number = NEXT_VIDEO_COUNTDOWN_SECONDS,
): number {
    const remaining = Math.max(0, Math.min(totalSeconds, remainingSeconds));

    if (totalSeconds <= 1) {
        return remaining <= 1 ? 1 : 0;
    }

    if (remaining <= 1) {
        return 1;
    }

    return (totalSeconds - remaining) / (totalSeconds - 1);
}

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
