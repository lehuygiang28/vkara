/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { ListVideo, Maximize, Minimize, Settings } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import { isServerPlaybackEcho, isYoutubePlaybackIntentState } from '@/lib/youtube-playback-sync';

import { CountdownTimer } from '@/components/countdown-timer';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { ScrollToTop } from '@/components/scroll-to-top';
import { PlayerControls } from './PlayerControls';
import { RemoteShell } from './RemoteShell';
import { TvPlayerQrZone } from './TvPlayerQrZone';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
    ConnectionStatusBanner,
    ConnectionStatusIndicator,
} from '@/components/connection-status-banner';

export default function YoutubePlayerPage() {
    const {
        room,
        showQRInPlayer,
        showBottomControls,
        opacityOfButtonsInPlayer,
        setPlayer,
        nextVideo,
        setIsPlaying,
        handleServerMessage,
        setLayoutMode,
        setCurrentTab,
    } = useYouTubeStore();

    const t = useScopedI18n('youtubePage');
    const t_Toast = useScopedI18n('toast');
    const locale = useCurrentLocale();
    const [showRemotePanel, setShowRemotePanel] = useState(false);
    const { isFullScreen, toggleFullScreen } = useFullscreen();
    const { shouldShowTimer, setShouldShowTimer, cancelCountdown } = useCountdownStore();
    const { effectiveLayoutMode, isTvViewport, needsLayoutBootstrap } = useEffectiveLayoutMode();
    const prevLayoutMode = useRef(effectiveLayoutMode);

    useStripRoomQueryFromUrl();

    const { ensureConnectedAndSend, lastMessage, connectionStatus } = useWebSocket();

    // No-op unless ENABLE_PERIODIC_PLAYBACK_SYNC — avoids polling getCurrentTime every second.
    usePlaybackPositionSync();

    useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage, t_Toast);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage, handleServerMessage]);

    useEffect(() => {
        if (effectiveLayoutMode === 'remote' && prevLayoutMode.current !== 'remote') {
            setCurrentTab('search');
        }
        prevLayoutMode.current = effectiveLayoutMode;
    }, [effectiveLayoutMode, setCurrentTab]);

    const onPlayerReady = (event: YT.PlayerEvent) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: YT.PlayerEvent) => {
        const playerState = event.target.getPlayerState();

        // TV: sync native controls to server only on settled PLAYING/PAUSED.
        // BUFFERING/CUED during remote play used to look like "paused" and spam pause → play loops.
        if (
            effectiveLayoutMode !== 'remote' &&
            room?.id &&
            isYoutubePlaybackIntentState(playerState) &&
            !isServerPlaybackEcho()
        ) {
            const playing = playerState === YT.PlayerState.PLAYING;
            const serverPlaying = useYouTubeStore.getState().room?.isPlaying;
            if (serverPlaying !== undefined && serverPlaying !== playing) {
                ensureConnectedAndSend({ type: playing ? 'play' : 'pause' });
            }
            setIsPlaying(playing);
        }

        if (playerState === YT.PlayerState.PLAYING) {
            cancelCountdown();
        }

        if (playerState === YT.PlayerState.ENDED) {
            setShouldShowTimer(true);
        }
    };

    const handleVideoFinished = () => {
        if (room) {
            ensureConnectedAndSend({ type: 'videoFinished' });
        } else {
            nextVideo();
        }
    };

    const handlerToggleFullScreen = () => {
        toggleFullScreen();
        setShowRemotePanel(false);
        if (!isFullScreen) {
            setLayoutMode('player', 'user');
        }
    };

    const openRemotePanel = (tab: 'queue' | 'settings') => {
        setShowRemotePanel(true);
        setCurrentTab(tab);
    };

    const isRemoteOnly = effectiveLayoutMode === 'remote';
    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !room?.playingNow);
    const isTvIdle = Boolean(isTvPlayerIdle && room?.id);
    const useTvIdleShell = needsLayoutBootstrap || isTvPlayerIdle;
    const isConnectionPending = connectionStatus !== 'OPEN';

    const renderPlayer = () => (
        <LayoutGroup id="tv-player-qr">
            <div className="relative h-full w-full">
                {room?.playingNow ? (
                    <YouTube
                        videoId={room.playingNow.id}
                        opts={{
                            height: '100%',
                            width: '100%',
                            playerVars: {
                                autoplay: 1,
                                controls: 1,
                                cc_load_policy: 0,
                                iv_load_policy: 3,
                                origin: 'https://youtube.com',
                            },
                        }}
                        onReady={onPlayerReady}
                        onStateChange={onPlayerStateChange}
                        className="absolute inset-0"
                    />
                ) : (
                    <div className="absolute inset-0 bg-zinc-950" aria-hidden />
                )}

                {isTvPlayerIdle && !room?.id && (
                    <div
                        className="absolute inset-0 z-[5] bg-zinc-950"
                        aria-busy={isConnectionPending}
                        aria-live="polite"
                    >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />
                    </div>
                )}

                {isTvPlayerIdle && <ConnectionStatusIndicator variant="tv-overlay" />}

                {isTvIdle && room?.id && (
                    <TvPlayerQrZone
                        roomId={room.id}
                        roomPassword={room.password}
                        locale={locale}
                        showQR={showQRInPlayer}
                        isIdle
                        onOpenSettingsAction={() => openRemotePanel('settings')}
                    />
                )}

                {isTvPlayerIdle && (
                    <div className="pointer-events-auto absolute right-3 top-3 z-[6] pt-safe pr-safe">
                        <LanguageSwitcher variant="overlay" />
                    </div>
                )}

                {room?.playingNow && shouldShowTimer && room.videoQueue.length > 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
                        <h3 className="mb-4 text-xl font-semibold">{t('nextUp')}</h3>
                        <div className="flex max-w-md flex-col items-center gap-4">
                            <img
                                src={room.videoQueue[0].thumbnail.url}
                                alt={room.videoQueue[0].title}
                                className="h-27 w-48 rounded-lg object-cover"
                            />
                            <div className="space-y-2">
                                <p className="line-clamp-2 font-medium">
                                    {room.videoQueue[0].title}
                                </p>
                                <VideoChannels
                                    video={room.videoQueue[0]}
                                    tone="inverse"
                                    className="justify-center text-center"
                                />
                                <p className="text-sm text-muted-foreground">
                                    {t('startingIn')}:{' '}
                                    <CountdownTimer
                                        classNames="text-sm font-medium text-white"
                                        initialSeconds={3}
                                        onCountdownComplete={handleVideoFinished}
                                    />
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute left-3 top-3 z-10 flex flex-col items-start gap-2.5 pt-safe pl-safe">
                    {!isTvPlayerIdle && room?.id && isTvViewport && showQRInPlayer && (
                        <TvPlayerQrZone
                            roomId={room.id}
                            roomPassword={room.password}
                            locale={locale}
                            showQR={showQRInPlayer}
                            isIdle={false}
                            onOpenSettingsAction={() => openRemotePanel('settings')}
                        />
                    )}

                    {!isTvPlayerIdle && (
                        <div
                            className="flex flex-col gap-2 transition-opacity"
                            style={{ opacity: opacityOfButtonsInPlayer / 100 }}
                        >
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-10 w-10 rounded-full border-0 bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
                                onClick={() => openRemotePanel('queue')}
                                aria-label={t('queue')}
                            >
                                <ListVideo className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-10 w-10 rounded-full border-0 bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
                                onClick={() => openRemotePanel('settings')}
                                aria-label={t('settings')}
                            >
                                <Settings className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="h-10 w-10 rounded-full border-0 bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
                                onClick={handlerToggleFullScreen}
                                aria-label={isFullScreen ? t('exitFullscreen') : t('fullscreen')}
                            >
                                {isFullScreen ? (
                                    <Minimize className="h-5 w-5" />
                                ) : (
                                    <Maximize className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </LayoutGroup>
    );

    if (needsLayoutBootstrap) {
        return (
            <div
                className="relative flex h-dvh-screen w-full flex-col overflow-hidden bg-zinc-950"
                aria-busy="true"
            >
                <ConnectionStatusIndicator variant="tv-overlay" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex h-dvh-screen w-full flex-col overflow-hidden',
                useTvIdleShell ? 'bg-zinc-950' : 'bg-background',
            )}
        >
            <ScrollToTop />
            {!useTvIdleShell && <ConnectionStatusBanner />}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:flex-row">
                {showsPlayer && (
                    <div
                        className={cn(
                            'relative min-h-0 w-full',
                            useTvIdleShell ? 'bg-zinc-950' : 'bg-black',
                            effectiveLayoutMode === 'both' &&
                                !isTvPlayerIdle &&
                                'md:h-full md:w-2/3 lg:w-3/4',
                            effectiveLayoutMode === 'both' && isTvPlayerIdle && 'h-full w-full',
                            effectiveLayoutMode === 'player' && 'h-[42dvh] md:h-full',
                            isRemoteOnly && 'hidden',
                        )}
                    >
                        {renderPlayer()}
                        {effectiveLayoutMode === 'both' &&
                            showBottomControls &&
                            !isTvPlayerIdle && (
                                <div className="hidden border-t bg-background/95 p-3 backdrop-blur lg:block">
                                    <PlayerControls variant="bar" />
                                </div>
                            )}
                    </div>
                )}

                {(isRemoteOnly || effectiveLayoutMode === 'both') && !isTvPlayerIdle && (
                    <div
                        className={cn(
                            'flex h-full min-h-0 w-full flex-1 flex-col',
                            effectiveLayoutMode === 'both' && 'md:w-1/3 md:border-l lg:w-1/4',
                            isRemoteOnly && 'mx-auto max-w-lg',
                        )}
                    >
                        <RemoteShell />
                    </div>
                )}

                <AnimatePresence>
                    {effectiveLayoutMode === 'player' && showRemotePanel && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-40 bg-black/60"
                                onClick={() => setShowRemotePanel(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background pt-safe pr-safe shadow-xl"
                            >
                                <RemoteShell />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
