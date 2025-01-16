import { useCallback, useEffect, useState } from 'react';

export function useFullscreen() {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const toggleFullScreen = useCallback(() => {
        const elem = document.documentElement;
        if (!isFullScreen) {
            if (elem?.requestFullscreen) {
                elem.requestFullscreen();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((elem as any)?.webkitRequestFullscreen) {
                // Safari
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (elem as any)?.webkitRequestFullscreen();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((elem as any)?.msRequestFullscreen) {
                // IE11
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (elem as any)?.msRequestFullscreen();
            }
            setIsFullScreen(true);
        } else {
            if (document?.exitFullscreen) {
                document.exitFullscreen();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((document as any)?.webkitExitFullscreen) {
                // Safari
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document as any)?.webkitExitFullscreen();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } else if ((document as any)?.msExitFullscreen) {
                // IE11
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document as any)?.msExitFullscreen();
            }
            setIsFullScreen(false);
        }
    }, [isFullScreen]);

    useEffect(() => {
        const fullscreenChangeHandler = () => {
            setIsFullScreen(
                !!(
                    document.fullscreenElement ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (document as any)?.webkitFullscreenElement ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (document as any)?.msFullscreenElement
                ),
            );
        };

        document.addEventListener('fullscreenchange', fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
        document.addEventListener('msfullscreenchange', fullscreenChangeHandler);

        return () => {
            document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', fullscreenChangeHandler);
            document.removeEventListener('msfullscreenchange', fullscreenChangeHandler);
        };
    }, []);

    return {
        isFullScreen,
        toggleFullScreen,
    };
}
