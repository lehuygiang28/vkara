'use client';

import { useEffect } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';

import { useScopedI18n, useCurrentLocale } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useTvRouteBootstrap } from '@/hooks/use-tv-route-bootstrap';
import { useTvOverlayStack } from '@/hooks/use-tv-overlay-stack';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { useTikTokHiddenPlayGuard } from '@/hooks/use-tiktok-hidden-play-guard';
import { useTikTokPhotoIndexSync } from '@/hooks/use-tiktok-photo-index-sync';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { ConnectionStatusToast } from '@/components/connection-status-toast';

import { TvSpatialRoot } from './tv-spatial-root';
import { TvPlayerHost } from './tv-player-host';
import { TvPlayerChrome } from './tv-player-chrome';
import { TvPlayerFixedQr } from './tv-player-fixed-qr';
import { TvSettingsPanel } from './tv-settings-panel';
import { TvLobby } from './tv-lobby';

export default function TvPage() {
    useTvRouteBootstrap();
    useStripRoomQueryFromUrl();
    usePlaybackPositionSync();
    useTikTokHiddenPlayGuard();
    useTikTokPhotoIndexSync();

    const tToast = useScopedI18n('toast');
    const locale = useCurrentLocale();
    const roomId = useYouTubeStore((s) => s.room?.id);
    const roomPassword = useYouTubeStore((s) => s.room?.password);
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const showQRInPlayer = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);
    const tvSuppressAutoCreate = useYouTubeStore((s) => s.tvSuppressAutoCreate);

    const { lastMessage } = useWebSocket();

    const showLobby = !roomId && tvSuppressAutoCreate;
    const inRoom = Boolean(roomId) && !showLobby;
    const isPlayerActive = inRoom && Boolean(playingNow);

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
        controlsEnabled: isPlayerActive,
        settingsCloseFocusKey: showLobby
            ? TV_FOCUS_KEYS.lobbyCreate
            : isPlayerActive
              ? TV_FOCUS_KEYS.ctrlPlayPause
              : TV_FOCUS_KEYS.idleQr,
    });

    useEffect(() => {
        if (!lastMessage) {
            return;
        }
        useYouTubeStore.getState().handleServerMessage(lastMessage, tToast, { isTvLayout: true });
    }, [lastMessage, tToast]);

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
                            <TvPlayerHost
                                onOpenSettingsAction={openSettings}
                                controlsVisible={controlsVisible}
                            />

                            {playingNow && showQRInPlayer && roomId ? (
                                <TvPlayerFixedQr
                                    roomId={roomId}
                                    roomPassword={roomPassword}
                                    locale={locale}
                                    onOpenSettingsAction={openSettings}
                                />
                            ) : null}

                            {isPlayerActive ? (
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
