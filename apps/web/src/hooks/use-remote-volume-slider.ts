'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

import {
    beginVolumeGesture,
    endVolumeGesture,
    markVolumeSentToRoom,
} from '@/lib/volume-remote-sync';

type UseRemoteVolumeSliderArgs = {
    volume: number;
    syncVolumeToRoom: (volume: number) => void | Promise<void>;
    commitVolumeToRoom: (volume: number) => void | Promise<void>;
};

export function useRemoteVolumeSlider({
    volume,
    syncVolumeToRoom,
    commitVolumeToRoom,
}: UseRemoteVolumeSliderArgs) {
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [scrubVolume, setScrubVolume] = useState(volume);
    const isAdjustingRef = useRef(false);
    const scrubVolumeRef = useRef(volume);

    useEffect(() => {
        if (!isAdjusting) {
            scrubVolumeRef.current = volume;
            setScrubVolume(volume);
        }
    }, [volume, isAdjusting]);

    const debouncedRoomSync = useDebouncedCallback(
        (next: number) => {
            markVolumeSentToRoom(next);
            void syncVolumeToRoom(next);
        },
        80,
        { leading: true, trailing: true },
    );

    const finishGesture = useCallback(
        (next: number) => {
            if (!isAdjustingRef.current) {
                return;
            }

            debouncedRoomSync.cancel();
            isAdjustingRef.current = false;
            setIsAdjusting(false);
            endVolumeGesture(next);
            scrubVolumeRef.current = next;
            setScrubVolume(next);
            void commitVolumeToRoom(next);
        },
        [commitVolumeToRoom, debouncedRoomSync],
    );

    const handlePointerDown = useCallback(() => {
        beginVolumeGesture();
        isAdjustingRef.current = true;
        setIsAdjusting(true);
        scrubVolumeRef.current = volume;
        setScrubVolume(volume);
    }, [volume]);

    const handlePointerUp = useCallback(() => {
        finishGesture(scrubVolumeRef.current);
    }, [finishGesture]);

    const handleValueChange = useCallback(
        (value: number[]) => {
            const next = value[0] ?? 0;
            scrubVolumeRef.current = next;
            setScrubVolume(next);
            debouncedRoomSync(next);
        },
        [debouncedRoomSync],
    );

    const handleValueCommit = useCallback(
        (value: number[]) => {
            finishGesture(value[0] ?? 0);
        },
        [finishGesture],
    );

    const cancelPendingSync = useCallback(() => {
        debouncedRoomSync.cancel();
    }, [debouncedRoomSync]);

    return {
        shownVolume: isAdjusting ? scrubVolume : volume,
        sliderHandlers: {
            onPointerDown: handlePointerDown,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
            onValueChange: handleValueChange,
            onValueCommit: handleValueCommit,
        },
        cancelPendingSync,
    };
}
