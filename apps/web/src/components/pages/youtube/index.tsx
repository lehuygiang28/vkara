'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Settings } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useStripRoomQueryFromUrl } from '@/hooks/use-strip-room-query';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { usePlaybackPositionSync } from '@/hooks/use-playback-position-sync';
import {
    applyPreferredPlaybackQuality,
    isServerPlaybackEcho,
    isYoutubePlaybackIntentState,
} from '@/lib/youtube-playback-sync';
import { isVideoLive } from '@/lib/youtube-video';

import { CountdownTimer } from '@/components/countdown-timer';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { RemoteShell } from './RemoteShell';
import { TvPlayerQrZone } from './TvPlayerQrZone';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ConnectionStatusToast } from '@/components/connection-status-toast';

const YoutubeTvEmbed = dynamic(
    () => import('./youtube-tv-embed').then((mod) => mod.YoutubeTvEmbed),
    { ssr: false },
);

function subscribeFinePointer(callback: () => void) {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getFinePointerSnapshot() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function YoutubePlayerPage() {
    const {
        room,
        setPlayer,
        setVolume,
        nextVideo,
        setIsPlaying,
        handleServerMessage,
        setCurrentTab,
    } = useYouTubeStore();

    const t = useScopedI18n('youtubePage');
    const t_Toast = useScopedI18n('toast');
    const locale = useCurrentLocale();
    const [showRemotePanel, setShowRemotePanel] = useState(false);
    const shouldShowTimer = useCountdownStore((state) => state.shouldShowTimer);
    const setShouldShowTimer = useCountdownStore((state) => state.setShouldShowTimer);
    const cancelCountdown = useCountdownStore((state) => state.cancelCountdown);
    const resetCountdown = useCountdownStore((state) => state.reset);
    const { effectiveLayoutMode, isTvViewport, needsLayoutBootstrap } = useEffectiveLayoutMode();
    const hasFinePointer = useSyncExternalStore(
        subscribeFinePointer,
        getFinePointerSnapshot,
        () => false,
    );
    const prevLayoutMode = useRef(effectiveLayoutMode);
    const skippedUnplayableRef = useRef<string | null>(null);
    const endedForVideoIdRef = useRef<string | null>(null);

    useStripRoomQueryFromUrl();

    const { ensureConnectedAndSend, lastMessage } = useWebSocket();

    // No-op unless ENABLE_PERIODIC_PLAYBACK_SYNC — avoids polling getCurrentTime every second.
    usePlaybackPositionSync();

    useEffect(() => {
        resetCountdown();
        endedForVideoIdRef.current = null;
    }, [room?.playingNow?.id, resetCountdown]);

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
        const { room: currentRoom, volume: storedVolume } = useYouTubeStore.getState();
        const targetVolume = Math.min(100, Math.max(0, currentRoom?.volume ?? storedVolume));
        event.target.setVolume(targetVolume);
        applyPreferredPlaybackQuality(event.target);
        if (targetVolume !== storedVolume) {
            setVolume(targetVolume);
        }
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
            applyPreferredPlaybackQuality(event.target);
            cancelCountdown();
        }

        if (playerState === YT.PlayerState.ENDED) {
            const current = useYouTubeStore.getState().room?.playingNow;
            if (!current || isVideoLive(current)) {
                return;
            }
            endedForVideoIdRef.current = current.id;
            setShouldShowTimer(true);
        }
    };

    const onPlayerError = (event: YT.OnErrorEvent) => {
        const errorCode = event.data;
        const isEmbedBlocked = errorCode === 101 || errorCode === 150;
        const isMissingOrBroken = errorCode === 100 || errorCode === 5 || errorCode === 2;

        if (!isEmbedBlocked && !isMissingOrBroken) {
            return;
        }

        const currentVideoId = useYouTubeStore.getState().room?.playingNow?.id;
        if (!currentVideoId || !room?.id) {
            return;
        }

        if (skippedUnplayableRef.current === currentVideoId) {
            return;
        }
        skippedUnplayableRef.current = currentVideoId;

        ensureConnectedAndSend({ type: 'skipUnplayableVideo', videoId: currentVideoId });
    };

    useEffect(() => {
        skippedUnplayableRef.current = null;
    }, [room?.playingNow?.id]);

    const handleVideoFinished = useCallback(() => {
        const currentRoom = useYouTubeStore.getState().room;
        const endedForId = endedForVideoIdRef.current;

        if (!endedForId || currentRoom?.playingNow?.id !== endedForId) {
            cancelCountdown();
            endedForVideoIdRef.current = null;
            return;
        }

        endedForVideoIdRef.current = null;

        if (currentRoom) {
            ensureConnectedAndSend({ type: 'videoFinished' });
        } else {
            nextVideo();
        }
    }, [cancelCountdown, ensureConnectedAndSend, nextVideo]);

    const openSettingsPanel = () => {
        setShowRemotePanel(true);
        setCurrentTab('settings');
    };

    const showQRInPlayer = room?.showQRInPlayer ?? true;
    const isRemoteOnly = effectiveLayoutMode === 'remote';
    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !room?.playingNow);
    const isTvIdle = Boolean(isTvPlayerIdle && room?.id);
    const useTvIdleShell = needsLayoutBootstrap || isTvPlayerIdle;
    const showPlayerSettingsButton =
        effectiveLayoutMode === 'player' && !isTvPlayerIdle && hasFinePointer;

    const renderPlayer = () => (
        <LayoutGroup id="tv-player-qr">
            <div className="relative h-full w-full">
                {room?.playingNow ? (
                    <YoutubeTvEmbed
                        key={`${room.playingNow.id}-${effectiveLayoutMode === 'both' ? 'laptop' : 'tv'}`}
                        videoId={room.playingNow.id}
                        onReadyAction={onPlayerReady}
                        onStateChangeAction={onPlayerStateChange}
                        onErrorAction={onPlayerError}
                        className="absolute inset-0"
                        variant={effectiveLayoutMode === 'both' ? 'laptop' : 'tv'}
                    />
                ) : (
                    <div className="absolute inset-0 bg-zinc-950" aria-hidden />
                )}

                {isTvPlayerIdle && !room?.id && (
                    <div
                        className="absolute inset-0 z-[5] bg-zinc-950"
                        aria-hidden
                    >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />
                    </div>
                )}

                {isTvIdle && room?.id && (
                    <TvPlayerQrZone
                        roomId={room.id}
                        roomPassword={room.password}
                        locale={locale}
                        showQR={showQRInPlayer}
                        isIdle
                        onOpenSettingsAction={openSettingsPanel}
                    />
                )}

                {isTvPlayerIdle && (
                    <div className="pointer-events-auto absolute right-safe-offset top-safe-offset z-[6]">
                        <LanguageSwitcher variant="overlay" />
                    </div>
                )}

                {room?.playingNow && shouldShowTimer && room.videoQueue.length > 0 && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-4 text-center">
                        <h3 className="mb-4 text-xl font-semibold">{t('nextUp')}</h3>
                        <div className="flex max-w-md flex-col items-center gap-4">
                            <div className="relative aspect-video w-48 overflow-hidden rounded-lg">
                                <Image
                                    src={room.videoQueue[0].thumbnail.url}
                                    alt={room.videoQueue[0].title}
                                    fill
                                    sizes="192px"
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
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

                <div className="absolute left-safe-offset top-safe-offset z-10 flex flex-col items-start gap-2.5">
                    {!isTvPlayerIdle && room?.id && isTvViewport && showQRInPlayer && (
                        <TvPlayerQrZone
                            roomId={room.id}
                            roomPassword={room.password}
                            locale={locale}
                            showQR={showQRInPlayer}
                            isIdle={false}
                            onOpenSettingsAction={openSettingsPanel}
                        />
                    )}
                </div>

                {showPlayerSettingsButton && (
                    <div className="player-settings-button pointer-events-auto absolute right-safe-offset top-safe-offset z-20">
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-10 w-10 rounded-full border-0 bg-black/55 text-white shadow-md backdrop-blur-sm hover:bg-black/75"
                            onClick={openSettingsPanel}
                            aria-label={t('settings')}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>
        </LayoutGroup>
    );

    if (needsLayoutBootstrap) {
        return (
            <div
                className="relative flex h-dvh-screen w-full flex-col overflow-hidden bg-zinc-950"
                aria-busy="true"
            >
                <ConnectionStatusToast />
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
            <ConnectionStatusToast />
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
                                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background pt-safe-offset pr-safe-offset shadow-xl"
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
