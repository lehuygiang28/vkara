'use client';

import { beginVolumeGesture, endVolumeGesture } from '@/lib/remote-gesture-sync';
import { useScrubberValue } from '@/hooks/use-scrubber-value';

type UseRemoteVolumeSliderArgs = {
    volume: number;
    commitVolumeToRoomAction: (volume: number) => void | Promise<void>;
};

const clampVolume = (value: number) => Math.min(100, Math.max(0, value));

export function useRemoteVolumeSlider({
    volume,
    commitVolumeToRoomAction: commitVolumeToRoom,
}: UseRemoteVolumeSliderArgs) {
    const { shownValue, isAdjusting, handlers } = useScrubberValue({
        value: volume,
        clampAction: clampVolume,
        onCommitAction: commitVolumeToRoom,
        onGestureBeginAction: beginVolumeGesture,
        onGestureEndAction: endVolumeGesture,
    });

    return {
        shownVolume: shownValue,
        isAdjustingVolume: isAdjusting,
        sliderHandlers: handlers,
    };
}
