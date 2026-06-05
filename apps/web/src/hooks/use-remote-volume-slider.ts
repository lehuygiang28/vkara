'use client';

import { useCallback } from 'react';

import {
    beginVolumeGesture,
    endVolumeGesture,
    markVolumeSentToRoom,
} from '@/lib/remote-gesture-sync';
import { useScrubberValue } from '@/hooks/use-scrubber-value';

type UseRemoteVolumeSliderArgs = {
    volume: number;
    syncVolumeToRoomAction: (volume: number) => void | Promise<void>;
    commitVolumeToRoomAction: (volume: number) => void | Promise<void>;
};

const clampVolume = (value: number) => Math.min(100, Math.max(0, value));

export function useRemoteVolumeSlider({
    volume,
    syncVolumeToRoomAction: syncVolumeToRoom,
    commitVolumeToRoomAction: commitVolumeToRoom,
}: UseRemoteVolumeSliderArgs) {
    const handleSync = useCallback(
        (next: number) => {
            markVolumeSentToRoom(next);
            void syncVolumeToRoom(next);
        },
        [syncVolumeToRoom],
    );

    const { shownValue, handlers, cancelPendingSync } = useScrubberValue({
        value: volume,
        clampAction: clampVolume,
        debounceMs: 80,
        onSyncAction: handleSync,
        onCommitAction: commitVolumeToRoom,
        onGestureBeginAction: beginVolumeGesture,
        onGestureEndAction: endVolumeGesture,
    });

    return {
        shownVolume: shownValue,
        sliderHandlers: handlers,
        cancelPendingSync,
    };
}
