import { create } from 'zustand';

export type ActionFeedbackVariant = 'success' | 'info' | 'warning';

const BURST_WINDOW_MS = 2800;

type ActionFeedbackPayload = {
    title: string;
    description?: string;
    variant?: ActionFeedbackVariant;
    duration?: number;
};

type ActionFeedbackState = {
    visible: boolean;
    title: string;
    description?: string;
    variant: ActionFeedbackVariant;
    /** Increments every show — drives enter / pulse animation. */
    tick: number;
    /** Rapid repeats with the same title while visible. */
    repeatCount: number;
    lastShownAt: number;
    hideTimer: ReturnType<typeof setTimeout> | null;
    show: (input: ActionFeedbackPayload) => void;
    dismiss: () => void;
};

export const useActionFeedbackStore = create<ActionFeedbackState>((set, get) => ({
    visible: false,
    title: '',
    description: undefined,
    variant: 'success',
    tick: 0,
    repeatCount: 0,
    lastShownAt: 0,
    hideTimer: null,
    show: (input) => {
        const prev = get().hideTimer;
        if (prev) clearTimeout(prev);

        const state = get();
        const variant = input.variant ?? 'success';
        const duration = input.duration ?? 2000;
        const now = Date.now();
        const inBurst =
            state.visible &&
            state.title === input.title &&
            state.variant === variant &&
            now - state.lastShownAt < BURST_WINDOW_MS;

        set({
            visible: true,
            title: input.title,
            description: input.description,
            variant,
            tick: state.tick + 1,
            repeatCount: inBurst ? state.repeatCount + 1 : 1,
            lastShownAt: now,
        });

        const hideTimer = setTimeout(() => {
            set({ visible: false, hideTimer: null, repeatCount: 0, lastShownAt: 0 });
        }, duration);

        set({ hideTimer });
    },
    dismiss: () => {
        const prev = get().hideTimer;
        if (prev) clearTimeout(prev);
        set({ visible: false, hideTimer: null, repeatCount: 0, lastShownAt: 0 });
    },
}));
