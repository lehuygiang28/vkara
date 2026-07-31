import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createMigratingPersistStorage } from '@/lib/persisted-storage';

interface KaraokeState {
    /** Whether this device has claimed the karaoke scorer role. */
    isScorerDevice: boolean;
    setIsScorerDevice: (value: boolean) => void;
    /** Seconds before the score overlay auto-dismisses (default: 5). */
    dismissDurationSec: number;
    setDismissDurationSec: (value: number) => void;
    /**
     * When true, show the score overlay on this phone even when a TV is present.
     * Default: false (score only shown on TV when a TV is in the room).
     */
    showScoreOnPhone: boolean;
    setShowScoreOnPhone: (value: boolean) => void;
}

/**
 * Persisted per-device flag: is this phone the designated karaoke scorer?
 *
 * Only one phone in a session should activate scoring at a time. This is
 * enforced by convention (honor-system), not by the server — which is
 * sufficient for casual home karaoke use.
 */
export const useKaraokeStore = create<KaraokeState>()(
    persist(
        (set) => ({
            isScorerDevice: false,
            setIsScorerDevice: (value) => set({ isScorerDevice: value }),
            dismissDurationSec: 5,
            setDismissDurationSec: (value) => set({ dismissDurationSec: value }),
            showScoreOnPhone: false,
            setShowScoreOnPhone: (value) => set({ showScoreOnPhone: value }),
        }),
        {
            name: 'vkara-karaoke',
            storage: createJSONStorage(() => createMigratingPersistStorage()),
            partialize: (state) => ({
                isScorerDevice: state.isScorerDevice,
                dismissDurationSec: state.dismissDurationSec,
                showScoreOnPhone: state.showScoreOnPhone,
            }),
        },
    ),
);
