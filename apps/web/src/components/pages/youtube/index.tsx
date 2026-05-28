/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { ListVideo, Maximize, Minimize, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCode } from 'react-qrcode-logo';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';
import { cn, generateShareableUrl, resolveRoomPasswordForShare } from '@/lib/utils';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';

import { CountdownTimer } from '@/components/countdown-timer';
import { Button } from '@/components/ui/button';
import { ScrollToTop } from '@/components/scroll-to-top';
import { PlayerControls } from './PlayerControls';
import { RemoteShell } from './RemoteShell';
import { ConnectionStatusBanner } from '@/components/connection-status-banner';

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
    const [showRemotePanel, setShowRemotePanel] = useState(false);
    const { isFullScreen, toggleFullScreen } = useFullscreen();
    const { shouldShowTimer, setShouldShowTimer, cancelCountdown } = useCountdownStore();
    const { effectiveLayoutMode, isTvViewport, needsLayoutBootstrap } = useEffectiveLayoutMode();
    const prevLayoutMode = useRef(effectiveLayoutMode);

    useStripRoomQueryFromUrl();

    const { ensureConnectedAndSend, lastMessage } = useWebSocket();

    // No-op unless ENABLE_PERIODIC_PLAYBACK_SYNC — avoids polling getCurrentTime every second.
    usePlaybackPositionSync();

    useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage, t_Toast);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage, handleServerMessage]);

    useEffect(() => {
        if (
            effectiveLayoutMode === 'remote' &&
            prevLayoutMode.current !== 'remote'
        ) {
            setCurrentTab('search');
        }
        prevLayoutMode.current = effectiveLayoutMode;
    }, [effectiveLayoutMode, setCurrentTab]);

    const onPlayerReady = (event: YT.PlayerEvent) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: YT.PlayerEvent) => {
        const playerState = event.target.getPlayerState();
        const playing = playerState === YT.PlayerState.PLAYING;

        // TV: native YouTube controls must sync to server so remotes stay in sync.
        if (effectiveLayoutMode !== 'remote' && room?.id) {
            const serverPlaying = useYouTubeStore.getState().room?.isPlaying;
            if (serverPlaying !== undefined && serverPlaying !== playing) {
                ensureConnectedAndSend({ type: playing ? 'play' : 'pause' });
            }
        }

        setIsPlaying(playing);

        if (playing) {
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

    const renderPlayer = () => (
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
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 px-6 text-center">
                    <motion.p
                        initial={{ opacity: 0.5, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="max-w-lg text-lg font-medium text-zinc-300 md:text-2xl"
                    >
                        {t('tvWaiting')}
                    </motion.p>
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
                            <p className="line-clamp-2 font-medium">{room.videoQueue[0].title}</p>
                            <p className="text-sm text-muted-foreground">
                                {room.videoQueue[0].channel.name}
                            </p>
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
                {room?.id && showQRInPlayer && isTvViewport && (
                    <div
                        className="player-qr-zone hidden flex-col rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 lg:flex"
                        onClick={() => openRemotePanel('settings')}
                        onKeyDown={(e) => e.key === 'Enter' && openRemotePanel('settings')}
                        role="button"
                        tabIndex={0}
                        aria-label={t('settings')}
                    >
                        <QRCode
                            value={generateShareableUrl({
                                roomId: room.id,
                                password: resolveRoomPasswordForShare(room.password),
                            })}
                            size={72}
                            qrStyle="dots"
                            eyeRadius={5}
                            quietZone={2}
                            ecLevel="L"
                        />
                        <span className="mt-1 text-center text-sm font-semibold text-white drop-shadow-sm">
                            {room.id.slice(0, 3)} {room.id.slice(3)}
                        </span>
                    </div>
                )}

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
            </div>
        </div>
    );

    if (needsLayoutBootstrap) {
        return <div className="h-dvh-screen w-full bg-zinc-950" aria-busy="true" />;
    }

    const isRemoteOnly = effectiveLayoutMode === 'remote';
    const showsPlayer =
        effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';

    return (
        <div className="flex h-dvh-screen w-full flex-col overflow-hidden bg-background">
            <ScrollToTop />
            <ConnectionStatusBanner />
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:flex-row">
                {showsPlayer && (
                    <div
                        className={cn(
                            'relative min-h-0 w-full bg-black',
                            effectiveLayoutMode === 'both' && 'md:h-full md:w-2/3 lg:w-3/4',
                            effectiveLayoutMode === 'player' && 'h-[42dvh] md:h-full',
                            isRemoteOnly && 'hidden',
                        )}
                    >
                        {renderPlayer()}
                        {effectiveLayoutMode === 'both' && showBottomControls && (
                            <div className="hidden border-t bg-background/95 p-3 backdrop-blur lg:block">
                                <PlayerControls variant="bar" />
                            </div>
                        )}
                    </div>
                )}

                {(isRemoteOnly || effectiveLayoutMode === 'both') && (
                    <div
                        className={cn(
                            'flex h-full min-h-0 w-full flex-1 flex-col',
                            effectiveLayoutMode === 'both' &&
                                'md:w-1/3 md:border-l lg:w-1/4',
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
