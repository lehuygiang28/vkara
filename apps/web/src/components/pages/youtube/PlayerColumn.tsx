'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { LayoutGroup } from 'framer-motion';

import { getYouTubeThumbnailUrl, getYouTubeThumbnailSrcSet } from '@vkara/shared-utils';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { NEXT_VIDEO_COUNTDOWN_SECONDS, useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';
import {
    applyPreferredPlaybackQuality,
    isServerPlaybackEcho,
    isYoutubePlaybackIntentState,
} from '@/lib/youtube-playback-sync';
import { isVideoLive } from '@/lib/youtube-video';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';

import { CountdownTimer } from '@/components/countdown-timer';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ControlsStageThumbnail } from './ControlsStageThumbnail';
import { TvPlayerQrZone } from './TvPlayerQrZone';

const YoutubeTvEmbed = dynamic(
    () => import('./youtube-tv-embed').then((mod) => mod.YoutubeTvEmbed),
    { ssr: false },
);

type PlayerColumnProps = {
    effectiveLayoutMode: YouTubeStoreLayoutMode;
    isTvViewport: boolean;
    hasFinePointer: boolean;
    onOpenSettingsAction: () => void;
    onSettingsPrefetchAction?: () => void;
};

export function PlayerColumn({
    effectiveLayoutMode,
    isTvViewport,
    hasFinePointer,
    onOpenSettingsAction,
    onSettingsPrefetchAction: onSettingsPrefetch,
}: PlayerColumnProps) {
    const { room, setPlayer, setVolume, nextVideo, setIsPlaying } = useYouTubeStore();
    const t = useScopedI18n('youtubePage');
    const locale = useCurrentLocale();
    const shouldShowTimer = useCountdownStore((state) => state.shouldShowTimer);
    const setShouldShowTimer = useCountdownStore((state) => state.setShouldShowTimer);
    const cancelCountdown = useCountdownStore((state) => state.cancelCountdown);
    const resetCountdown = useCountdownStore((state) => state.reset);
    const { ensureConnectedAndSend } = useWebSocket();

    const skippedUnplayableRef = useRef<string | null>(null);
    const endedForVideoIdRef = useRef<string | null>(null);

    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !room?.playingNow);
    const isTvIdle = Boolean(isTvPlayerIdle && room?.id);
    const showQRInPlayer = room?.showQRInPlayer ?? true;
    const showPlayerSettingsButton =
        effectiveLayoutMode === 'player' && !isTvPlayerIdle && hasFinePointer;

    useEffect(() => {
        resetCountdown();
        endedForVideoIdRef.current = null;
    }, [room?.playingNow?.id, resetCountdown]);

    useEffect(() => {
        skippedUnplayableRef.current = null;
    }, [room?.playingNow?.id]);

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

    return (
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
                    <div className="absolute inset-0 z-[5] bg-zinc-950" aria-hidden>
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
                        onOpenSettingsAction={onOpenSettingsAction}
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
                        <div className="flex w-full max-w-lg flex-col items-center gap-4 px-2">
                            <ControlsStageThumbnail
                                src={getYouTubeThumbnailUrl(
                                    room.videoQueue[0].thumbnails,
                                    'large',
                                    room.videoQueue[0].id,
                                )}
                                srcSet={getYouTubeThumbnailSrcSet(
                                    room.videoQueue[0].thumbnails,
                                    room.videoQueue[0].id,
                                )}
                                title={room.videoQueue[0].title}
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
                                        initialSeconds={NEXT_VIDEO_COUNTDOWN_SECONDS}
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
                            onOpenSettingsAction={onOpenSettingsAction}
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
                            onClick={onOpenSettingsAction}
                            onMouseEnter={onSettingsPrefetch}
                            onFocus={onSettingsPrefetch}
                            aria-label={t('settings')}
                        >
                            <Settings className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>
        </LayoutGroup>
    );
}
