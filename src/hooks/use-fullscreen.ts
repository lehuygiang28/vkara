import { useCallback, useEffect, useState, RefObject } from 'react';
import screenfull from 'screenfull';

type FullscreenElement = HTMLElement | null;

/**
 * A hook that provides a state and a function to toggle the full screen mode
 *
 * @param elementOrRef - Optional HTMLElement or RefObject<HTMLElement> to be used for fullscreen
 * @returns An object with two properties: `isFullScreen` which is a boolean
 * indicating whether the app is currently in full screen mode, and
 * `toggleFullScreen` which is a function that toggles the full screen mode on
 * and off
 */
export function useFullscreen(elementOrRef?: FullscreenElement | RefObject<FullscreenElement>): {
    readonly isFullScreen: boolean;
    readonly toggleFullScreen: () => void;
} {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const handleFullScreenChange = useCallback(() => {
        setIsFullScreen(screenfull.isFullscreen);
    }, []);

    useEffect(() => {
        if (!screenfull.isEnabled) {
            return;
        }

        screenfull.on('change', handleFullScreenChange);

        return () => {
            screenfull.off('change', handleFullScreenChange);
        };
    }, [handleFullScreenChange]);

    const getElement = (): FullscreenElement => {
        if (elementOrRef && 'current' in elementOrRef) {
            return elementOrRef.current;
        }
        return elementOrRef || document.documentElement;
    };

    return {
        isFullScreen,
        toggleFullScreen: () => {
            if (!screenfull.isEnabled) return;

            const element = getElement();
            if (!element) return;

            if (screenfull.isFullscreen) {
                screenfull.exit();
            } else {
                screenfull.request(element);
            }
        },
    };
}
