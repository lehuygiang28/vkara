'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';

import { isTvBackKey, isTvRevealKey, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { useYouTubeStore } from '@/store/youtubeStore';

const HIDE_DELAY_MS = 5000;

type UseTvOverlayStackOptions = {
    /** Player mode: auto-hide control bar. Lobby still uses settings/back stack. */
    controlsEnabled?: boolean;
};

export function useTvOverlayStack({ controlsEnabled = true }: UseTvOverlayStackOptions = {}) {
    const [controlsVisible, setControlsVisible] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [queueExpanded, setQueueExpanded] = useState(false);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const controlsVisibleRef = useRef(controlsVisible);
    const settingsOpenRef = useRef(settingsOpen);
    controlsVisibleRef.current = controlsVisible;
    settingsOpenRef.current = settingsOpen;

    const drawerOpen = settingsOpen;

    const clearHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const scheduleHide = useCallback(() => {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
            setSettingsOpen(false);
            setQueueExpanded(false);
        }, HIDE_DELAY_MS);
    }, [clearHideTimer]);

    const revealControls = useCallback(() => {
        if (!controlsEnabled) {
            return;
        }
        setControlsVisible(true);
        if (!drawerOpen) {
            scheduleHide();
        }
    }, [controlsEnabled, drawerOpen, scheduleHide]);

    const hideControls = useCallback(() => {
        clearHideTimer();
        setControlsVisible(false);
        setSettingsOpen(false);
        setQueueExpanded(false);
    }, [clearHideTimer]);

    const collapseQueue = useCallback(() => {
        setQueueExpanded(false);
    }, []);

    const focusQueue = useCallback(() => {
        if (!controlsEnabled) {
            return;
        }
        setSettingsOpen(false);
        setControlsVisible(true);
        setQueueExpanded(true);
        clearHideTimer();
        requestAnimationFrame(() => {
            const playingId = useYouTubeStore.getState().room?.playingNow?.id;
            if (playingId) {
                setFocus(TV_FOCUS_KEYS.queueItem(playingId));
                return;
            }
            const firstQueued = useYouTubeStore.getState().room?.videoQueue?.[0]?.id;
            if (firstQueued) {
                setFocus(TV_FOCUS_KEYS.queueItem(firstQueued));
                return;
            }
            setFocus(TV_FOCUS_KEYS.queuePanel);
        });
    }, [controlsEnabled, clearHideTimer]);

    const openSettings = useCallback(() => {
        setSettingsOpen(true);
        setQueueExpanded(false);
        if (controlsEnabled) {
            setControlsVisible(true);
        }
        clearHideTimer();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    setFocus(`${TV_FOCUS_KEYS.settingsQrToggle}_show`);
                } catch {
                    try {
                        setFocus(TV_FOCUS_KEYS.settingsCreate);
                    } catch {
                        // Settings tree may not be mounted yet.
                    }
                }
            });
        });
    }, [controlsEnabled, clearHideTimer]);

    const closeSettings = useCallback(() => {
        setSettingsOpen(false);
        setQueueExpanded(false);
        revealControls();
        requestAnimationFrame(() => setFocus(TV_FOCUS_KEYS.ctrlPlayPause));
    }, [revealControls]);

    const toggleSettings = useCallback(() => {
        if (settingsOpen) {
            closeSettings();
            return;
        }
        openSettings();
    }, [settingsOpen, openSettings, closeSettings]);

    const closeDrawers = useCallback(() => {
        setSettingsOpen(false);
        revealControls();
        requestAnimationFrame(() => setFocus(TV_FOCUS_KEYS.ctrlPlayPause));
    }, [revealControls]);

    const handleBack = useCallback(() => {
        if (settingsOpen) {
            closeSettings();
            return true;
        }

        if (controlsVisible) {
            hideControls();
            return true;
        }

        return false;
    }, [settingsOpen, controlsVisible, closeSettings, hideControls]);

    useEffect(() => {
        if (!controlsEnabled) {
            setControlsVisible(false);
            setSettingsOpen(false);
            clearHideTimer();
        }
    }, [controlsEnabled, clearHideTimer]);

    useEffect(() => {
        if (drawerOpen) {
            setControlsVisible(true);
            clearHideTimer();
            return;
        }

        if (controlsVisible) {
            scheduleHide();
        }
    }, [drawerOpen, controlsVisible, scheduleHide, clearHideTimer]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (isTvBackKey(event.key)) {
                if (handleBack()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                return;
            }

            if (isTvRevealKey(event.key)) {
                if (settingsOpenRef.current) {
                    return;
                }

                const wasHidden = !controlsVisibleRef.current;
                revealControls();

                const active = document.activeElement;
                if (active instanceof HTMLIFrameElement) {
                    active.blur();
                    requestAnimationFrame(() => {
                        try {
                            setFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                        } catch {
                            // Spatial tree may not be mounted yet.
                        }
                    });
                    return;
                }

                // Only seed focus when the overlay was hidden. While controls are
                // already visible, let Norigin spatial nav handle arrows/enter.
                if (wasHidden) {
                    requestAnimationFrame(() => {
                        try {
                            setFocus(TV_FOCUS_KEYS.ctrlPlayPause);
                        } catch {
                            // Spatial tree may not be mounted yet.
                        }
                    });
                }
            }
        };

        window.addEventListener('keydown', onKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
    }, [handleBack, revealControls]);

    useEffect(() => () => clearHideTimer(), [clearHideTimer]);

    return {
        controlsVisible: controlsEnabled && controlsVisible,
        settingsOpen,
        queueExpanded,
        drawerOpen,
        revealControls,
        hideControls,
        focusQueue,
        collapseQueue,
        openSettings,
        toggleSettings,
        closeSettings,
        closeDrawers,
        handleBack,
    };
}
