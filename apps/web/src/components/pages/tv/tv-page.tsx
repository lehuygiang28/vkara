'use client';

import { useEffect } from 'react';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useWebSocketStore } from '@/store/websocketStore';
import { useTvRouteBootstrap } from '@/hooks/use-tv-route-bootstrap';
import { useTvOverlayStack } from '@/hooks/use-tv-overlay-stack';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { useTikTokHiddenPlayGuard } from '@/hooks/use-tiktok-hidden-play-guard';
import { useTikTokPhotoIndexSync } from '@/hooks/use-tiktok-photo-index-sync';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { ConnectionStatusToast } from '@/components/connection-status-toast';

import { TvSpatialRoot } from './tv-spatial-root';
import { TvPlayerHost } from './tv-player-host';
import { TvPlayerChrome } from './tv-player-chrome';
import { TvSettingsPanel } from './tv-settings-panel';
import { TvSpatialLobby } from './tv-spatial-lobby';

export default function TvPage() {
    useTvRouteBootstrap();
    useStripRoomQueryFromUrl();
    usePlaybackPositionSync();
    useTikTokHiddenPlayGuard();
    useTikTokPhotoIndexSync();

    const tToast = useScopedI18n('toast');
    const roomId = useYouTubeStore((s) => s.room?.id);
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const showQRInPlayer = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);
    const tvSuppressAutoCreate = useYouTubeStore((s) => s.tvSuppressAutoCreate);
    const connectionStatus = useWebSocketStore((s) => s.connectionStatus);

    const { lastMessage } = useWebSocket();

    const showLobby = !roomId && tvSuppressAutoCreate;

    const {
        controlsVisible,
        settingsOpen,
        queueExpanded,
        revealControls,
        openSettings,
        focusQueue,
        collapseQueue,
        closeSettings,
    } = useTvOverlayStack({ controlsEnabled: !showLobby });

    useEffect(() => {
        if (!lastMessage) {
            return;
        }
        useYouTubeStore.getState().handleServerMessage(lastMessage, tToast, { isTvLayout: true });
    }, [lastMessage, tToast]);

    const isOffline = connectionStatus !== 'OPEN';

    return (
        <TvSpatialRoot>
            <div className="relative h-[100dvh] w-full overflow-hidden bg-zinc-950 text-zinc-100">
                <ConnectionStatusToast />
                <main className="relative h-full w-full overflow-hidden">
                    {showLobby ? (
                        <div className="flex h-full items-center justify-center px-4 py-8">
                            <TvSpatialLobby onOpenSettingsAction={openSettings} />
                            {settingsOpen ? (
                                <TvSettingsPanel
                                    onCloseAction={closeSettings}
                                    variant="fullscreen"
                                />
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <TvPlayerHost
                                onOpenSettingsAction={openSettings}
                                isOffline={isOffline}
                                controlsVisible={controlsVisible}
                            />

                            <TvPlayerChrome
                                visible={controlsVisible}
                                settingsOpen={settingsOpen}
                                queueExpanded={queueExpanded}
                                showQrInPlayer={showQRInPlayer}
                                onRevealAction={revealControls}
                                onQueueFocusAction={focusQueue}
                                onQueueCollapseAction={collapseQueue}
                                onOpenSettingsAction={openSettings}
                                onCloseSettingsAction={closeSettings}
                            />

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
