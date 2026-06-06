'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef } from 'react';

import { Settings } from 'lucide-react';
import { LayoutGroup } from 'framer-motion';

import { getYouTubeThumbnailUrl, getYouTubeThumbnailSrcSet } from '@vkara/youtube';
import { useYouTubeStore } from '@/store/youtubeStore';
import { DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { needsPlaybackSeekCorrection } from '@vkara/room';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { NEXT_VIDEO_COUNTDOWN_SECONDS, useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';
import {
    applyYoutubeCaptions,
    listYoutubeCaptionTracks,
    scheduleCaptionTrackSync,
} from '@/lib/youtube-captions';
import {
    applyPreferredPlaybackQuality,
    applyRoomPlaybackToPlayer,
    clearPlaybackBroadcastSuppression,
    isPlayerActuallyPlaying,
    isYoutubePlaybackIntentState,
    loadTrackOnPlayer,
    shouldSuppressPlaybackBroadcast,
    markServerPlaybackCommand,
} from '@/lib/youtube-playback-sync';
import { isVideoLive } from '@/lib/youtube-video';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';

import { CountdownTimer } from '@/components/countdown-timer';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ControlsStageThumbnail } from './ControlsStageThumbnail';
import { TvIdleLayoutSwitch } from './TvIdleLayoutSwitch';
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
    const captionSyncCleanupRef = useRef<(() => void) | null>(null);
    const prevPlayingNowIdRef = useRef<string | null>(null);
    /** Frozen `videoId` prop — track advances use `loadVideoById`, not react-youtube reset. */
    const embedSeedVideoIdRef = useRef<string | null>(null);

    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !room?.playingNow);
    const isTvIdle = Boolean(isTvPlayerIdle && room?.id);
    const isBothIdleLayout = effectiveLayoutMode === 'both' && isTvIdle;
    const showQRInPlayer = room?.showQRInPlayer ?? true;
    const captionsEnabled = room?.captionsEnabled ?? false;
    const captionsLanguage = room?.captionsLanguage ?? DEFAULT_CAPTION_LANGUAGE;
    const showPlayerSettingsButton =
        effectiveLayoutMode === 'player' && !isTvPlayerIdle && hasFinePointer;

    useEffect(() => {
        resetCountdown();
        endedForVideoIdRef.current = null;
    }, [room?.playingNow?.id, resetCountdown]);

    useEffect(() => {
        skippedUnplayableRef.current = null;
        captionSyncCleanupRef.current?.();
        captionSyncCleanupRef.current = null;
    }, [room?.playingNow?.id]);

    const playingNowId = room?.playingNow?.id;
    const roomIsPlaying = room?.isPlaying ?? false;
    const roomId = room?.id;

    useEffect(() => {
        if (effectiveLayoutMode === 'remote' || !roomId || !playingNowId) {
            return;
        }
        const seedId = embedSeedVideoIdRef.current;
        if (seedId && playingNowId !== seedId) {
            return;
        }
        const player = useYouTubeStore.getState().player;
        if (!player) {
            return;
        }
        applyRoomPlaybackToPlayer(player, roomIsPlaying);
    }, [effectiveLayoutMode, roomId, playingNowId, roomIsPlaying]);

    const syncCaptionTracksFromPlayer = useCallback(
        (player: YT.Player) => {
            const currentRoom = useYouTubeStore.getState().room;
            const videoId = currentRoom?.playingNow?.id;
            if (!currentRoom?.id || !videoId) {
                return;
            }

            const tracks = listYoutubeCaptionTracks(player);
            ensureConnectedAndSend({
                type: 'syncCaptionTracks',
                videoId,
                tracks,
            });
        },
        [ensureConnectedAndSend],
    );

    const applyTrackToPlayer = useCallback(
        (player: YT.Player, videoId: string) => {
            const currentRoom = useYouTubeStore.getState().room;
            const shouldPlay = currentRoom?.isPlaying ?? false;
            loadTrackOnPlayer(player, videoId, shouldPlay);
            applyPreferredPlaybackQuality(player);
            applyYoutubeCaptions(player, {
                enabled: currentRoom?.captionsEnabled ?? false,
                languageCode: currentRoom?.captionsLanguage ?? DEFAULT_CAPTION_LANGUAGE,
                tracks: currentRoom?.captionTracks ?? [],
            });
            captionSyncCleanupRef.current?.();
            captionSyncCleanupRef.current = scheduleCaptionTrackSync(
                player,
                syncCaptionTracksFromPlayer,
            );

            applyRoomPlaybackToPlayer(player, shouldPlay);
        },
        [syncCaptionTracksFromPlayer],
    );

    useEffect(() => {
        if (!playingNowId) {
            embedSeedVideoIdRef.current = null;
            prevPlayingNowIdRef.current = null;
            return;
        }

        if (embedSeedVideoIdRef.current === null) {
            embedSeedVideoIdRef.current = playingNowId;
            prevPlayingNowIdRef.current = playingNowId;
            return;
        }

        const prevId = prevPlayingNowIdRef.current;
        prevPlayingNowIdRef.current = playingNowId;

        if (!prevId || prevId === playingNowId) {
            return;
        }

        const player = useYouTubeStore.getState().player;
        if (!player) {
            return;
        }

        applyTrackToPlayer(player, playingNowId);
    }, [playingNowId, applyTrackToPlayer]);

    useEffect(() => {
        const player = useYouTubeStore.getState().player;
        const currentRoom = useYouTubeStore.getState().room;
        if (!player) {
            return;
        }
        applyYoutubeCaptions(player, {
            enabled: captionsEnabled,
            languageCode: captionsLanguage,
            tracks: currentRoom?.captionTracks ?? [],
        });
    }, [captionsEnabled, captionsLanguage, room?.captionTracks, room?.captionTracksVideoId]);

    const onPlayerReady = (event: YT.PlayerEvent) => {
        setPlayer(event.target);
        const { room: currentRoom, volume: storedVolume } = useYouTubeStore.getState();
        const targetVolume = Math.min(100, Math.max(0, currentRoom?.volume ?? storedVolume));
        event.target.setVolume(targetVolume);
        applyPreferredPlaybackQuality(event.target);
        applyYoutubeCaptions(event.target, {
            enabled: currentRoom?.captionsEnabled ?? false,
            languageCode: currentRoom?.captionsLanguage ?? DEFAULT_CAPTION_LANGUAGE,
            tracks: currentRoom?.captionTracks ?? [],
        });
        captionSyncCleanupRef.current?.();
        captionSyncCleanupRef.current = scheduleCaptionTrackSync(
            event.target,
            syncCaptionTracksFromPlayer,
        );
        if (targetVolume !== storedVolume) {
            setVolume(targetVolume);
        }

        const serverTime = currentRoom?.currentTime ?? 0;
        if (
            currentRoom?.playingNow &&
            serverTime > 0 &&
            needsPlaybackSeekCorrection(event.target.getCurrentTime(), serverTime)
        ) {
            markServerPlaybackCommand();
            event.target.seekTo(serverTime, true);
        }

        if (currentRoom?.playingNow) {
            applyRoomPlaybackToPlayer(event.target, currentRoom.isPlaying ?? false);
        }
    };

    const onPlayerStateChange = (event: YT.PlayerEvent) => {
        const playerState = event.target.getPlayerState();

        if (effectiveLayoutMode !== 'remote' && room?.id && !shouldSuppressPlaybackBroadcast()) {
            const serverPlaying = useYouTubeStore.getState().room?.isPlaying ?? false;

            if (isYoutubePlaybackIntentState(playerState)) {
                const playing = playerState === YT.PlayerState.PLAYING;
                if (serverPlaying !== playing) {
                    ensureConnectedAndSend({ type: playing ? 'play' : 'pause' });
                }
                setIsPlaying(playing);
            } else if (isPlayerActuallyPlaying(event.target) !== serverPlaying) {
                const playing = isPlayerActuallyPlaying(event.target);
                if (playing) {
                    ensureConnectedAndSend({ type: 'play' });
                } else {
                    ensureConnectedAndSend({ type: 'pause' });
                }
                setIsPlaying(playing);
            }
        }

        if (playerState === YT.PlayerState.PLAYING || playerState === YT.PlayerState.CUED) {
            syncCaptionTracksFromPlayer(event.target);
        }

        if (playerState === YT.PlayerState.PLAYING) {
            clearPlaybackBroadcastSuppression();
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
                        key={effectiveLayoutMode === 'both' ? 'laptop' : 'tv'}
                        videoId={embedSeedVideoIdRef.current ?? room.playingNow.id}
                        autoplay={room.isPlaying ?? false}
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
                        compact={isBothIdleLayout}
                        onOpenSettingsAction={onOpenSettingsAction}
                    />
                )}

                {isTvPlayerIdle && (
                    <div className="pointer-events-auto absolute right-safe-offset top-safe-offset z-[6] flex items-center gap-3 sm:gap-4">
                        {hasFinePointer ? (
                            <TvIdleLayoutSwitch effectiveLayoutMode={effectiveLayoutMode} />
                        ) : null}
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
