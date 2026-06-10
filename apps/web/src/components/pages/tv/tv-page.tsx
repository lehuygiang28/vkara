'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { useShallow } from 'zustand/react/shallow';

import { useScopedI18n, useCurrentLocale } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useTvRouteBootstrap } from '@/hooks/use-tv-route-bootstrap';
import { useTvOverlayStack } from '@/hooks/use-tv-overlay-stack';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';

import { TvSpatialRoot } from './tv-spatial-root';
import { TvPlayerHost } from './tv-player-host';
import { TvEmbedFocusGuard } from './tv-embed-focus-guard';
import { TvNextUpGate } from './tv-next-up-gate';

const ConnectionStatusToast = dynamic(
    () =>
        import('@/components/connection-status-toast').then((m) => ({
            default: m.ConnectionStatusToast,
        })),
    { ssr: false },
);

const TvLobby = dynamic(() => import('./tv-lobby').then((m) => ({ default: m.TvLobby })), {
    ssr: false,
});
const TvPlayerChrome = dynamic(
    () => import('./tv-player-chrome').then((m) => ({ default: m.TvPlayerChrome })),
    { ssr: false },
);
const TvPlayerFixedQr = dynamic(
    () => import('./tv-player-fixed-qr').then((m) => ({ default: m.TvPlayerFixedQr })),
    { ssr: false },
);
const TvSettingsPanel = dynamic(
    () => import('./tv-settings-panel').then((m) => ({ default: m.TvSettingsPanel })),
    { ssr: false },
);

export default function TvPage() {
    useTvRouteBootstrap();
    useStripRoomQueryFromUrl();
    usePlaybackPositionSync();

    const tToast = useScopedI18n('toast');
    const locale = useCurrentLocale();
    const {
        roomId,
        roomPassword,
        playingNow,
        showQRInPlayer,
        videoQueueLength,
        tvSuppressAutoCreate,
    } = useYouTubeStore(
        useShallow((s) => ({
            roomId: s.room?.id,
            roomPassword: s.room?.password,
            playingNow: s.room?.playingNow,
            showQRInPlayer: s.room?.showQRInPlayer ?? true,
            videoQueueLength: s.room?.videoQueue?.length ?? 0,
            tvSuppressAutoCreate: s.tvSuppressAutoCreate,
        })),
    );
    const shouldShowNextUp = useCountdownStore((s) => s.shouldShowTimer);

    const showLobby = !roomId && tvSuppressAutoCreate;
    const inRoom = Boolean(roomId) && !showLobby;
    const isPlayerActive = inRoom && Boolean(playingNow);
    const nextUpVisible = isPlayerActive && shouldShowNextUp && videoQueueLength > 0;

    const {
        controlsVisible,
        settingsOpen,
        queueExpanded,
        revealControls,
        openSettings,
        focusQueue,
        collapseQueue,
        closeSettings,
        hideControls,
    } = useTvOverlayStack({
        controlsEnabled: isPlayerActive && !nextUpVisible,
        idleFocusKey: inRoom && !isPlayerActive ? TV_FOCUS_KEYS.idleQr : undefined,
        settingsCloseFocusKey: showLobby
            ? TV_FOCUS_KEYS.lobbyCreate
            : isPlayerActive
              ? TV_FOCUS_KEYS.ctrlPlayPause
              : TV_FOCUS_KEYS.idleQr,
    });

    const isIdleScreen = inRoom && !isPlayerActive && !settingsOpen;
    const chromeMounted =
        isPlayerActive &&
        !nextUpVisible &&
        (controlsVisible || settingsOpen || queueExpanded);

    useEffect(() => {
        let prevLastMessage = useWebSocketStore.getState().lastMessage;
        return useWebSocketStore.subscribe((state) => {
            if (state.lastMessage === prevLastMessage) {
                return;
            }
            prevLastMessage = state.lastMessage;
            if (!state.lastMessage) {
                return;
            }
            useYouTubeStore
                .getState()
                .handleServerMessage(state.lastMessage, tToast, { isTvLayout: true });
        });
    }, [tToast]);

    useEffect(() => {
        if (!isPlayerActive) {
            return;
        }
        void import('./tv-player-chrome');
        void import('./tv-player-fixed-qr');
    }, [isPlayerActive]);

    useEffect(() => {
        if (!showLobby) {
            return;
        }

        hideControls();
        closeSettings();

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    setFocus(TV_FOCUS_KEYS.lobbyCreate);
                } catch {
                    // Spatial tree may not be ready.
                }
            });
        });

        return () => cancelAnimationFrame(frame);
    }, [showLobby, hideControls, closeSettings]);

    useEffect(() => {
        if (!isIdleScreen) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    setFocus(TV_FOCUS_KEYS.idleQr);
                } catch {
                    // Spatial tree may not be ready on first paint.
                }
            });
        });

        return () => cancelAnimationFrame(frame);
    }, [isIdleScreen]);

    useEffect(() => {
        if (isPlayerActive) {
            return;
        }

        hideControls();
    }, [isPlayerActive, hideControls]);

    return (
        <TvSpatialRoot>
            <div className="relative h-[100dvh] w-full overflow-hidden bg-zinc-950 text-zinc-100">
                <ConnectionStatusToast />
                <main className="relative h-full w-full overflow-hidden">
                    {showLobby ? (
                        <TvLobby />
                    ) : (
                        <>
                            <TvPlayerHost onOpenSettingsAction={openSettings} />

                            {isPlayerActive && playingNow ? (
                                <TvEmbedFocusGuard
                                    controlsVisible={controlsVisible && !nextUpVisible}
                                />
                            ) : null}

                            {isPlayerActive ? <TvNextUpGate /> : null}

                            {playingNow && showQRInPlayer && roomId && !nextUpVisible ? (
                                <TvPlayerFixedQr
                                    roomId={roomId}
                                    roomPassword={roomPassword}
                                    locale={locale}
                                    expanded={controlsVisible && !settingsOpen}
                                    onOpenSettingsAction={openSettings}
                                />
                            ) : null}

                            {chromeMounted ? (
                                <TvPlayerChrome
                                    visible={controlsVisible}
                                    settingsOpen={settingsOpen}
                                    queueExpanded={queueExpanded}
                                    onRevealAction={revealControls}
                                    onQueueFocusAction={focusQueue}
                                    onQueueCollapseAction={collapseQueue}
                                    onOpenSettingsAction={openSettings}
                                    onCloseSettingsAction={closeSettings}
                                />
                            ) : settingsOpen ? (
                                <TvSettingsPanel onCloseAction={closeSettings} />
                            ) : null}

                            {!controlsVisible && playingNow ? (
                                <div
                                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 bg-gradient-to-t from-black/60 to-transparent"
                                    aria-hidden
                                />
                            ) : null}
                        </>
                    )}
                </main>
            </div>
        </TvSpatialRoot>
    );
}
