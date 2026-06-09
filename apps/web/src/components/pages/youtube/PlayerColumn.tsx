'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Settings } from 'lucide-react';
import { LayoutGroup } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';

import { type CaptionTrack, type YouTubeVideo } from '@vkara/youtube';
import { getVideoThumbnailSrcSet, getVideoThumbnailUrl } from '@vkara/tiktok';
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
import { applyPlaybackIntent, isTikTokPlayback } from '@/lib/active-playback';
import {
    applyPreferredPlaybackQuality,
    applyRoomPlaybackToPlayer,
    clearPlaybackBroadcastSuppression,
    isPlayerActuallyPlaying,
    isYoutubePlaybackIntentState,
    isYoutubePlayerUsable,
    loadTrackOnPlayer,
    shouldSuppressPlaybackBroadcast,
    markServerPlaybackCommand,
} from '@/lib/youtube-playback-sync';
import { isVideoLive } from '@vkara/tiktok';
import { cn } from '@/lib/utils';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';

import { CountdownTimer } from '@/components/countdown-timer';
import { VideoChannels } from '@/components/video-channels';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ControlsStageThumbnail } from './ControlsStageThumbnail';
import { LayoutModeSwitch, RECOVERY_MODE_CHOICES } from '@/components/layout-mode-switch';
import { useViewportWidth } from '@/hooks/use-viewport-layout';
import { TV_MIN_WIDTH_PX } from '@/lib/layout-mode';
import { TvIdleLayoutSwitch } from './TvIdleLayoutSwitch';
import { TvPlayerQrZone } from './TvPlayerQrZone';
import { TvRoomLobby } from './TvRoomLobby';
import { PlayerEmbedSurfaceMemo } from '@/components/player/player-embed-surface';

/** Stable fallbacks — `?? []` in selectors creates new refs and loops with useShallow. */
const EMPTY_VIDEO_QUEUE: YouTubeVideo[] = [];
const EMPTY_CAPTION_TRACKS: CaptionTrack[] = [];

type PlayerColumnProps = {
    effectiveLayoutMode: YouTubeStoreLayoutMode;
    isTvViewport: boolean;
    hasFinePointer: boolean;
    onOpenSettingsAction: () => void;
    onSettingsPrefetchAction?: () => void;
};

function PlayerColumnInner({
    effectiveLayoutMode,
    isTvViewport,
    hasFinePointer,
    onOpenSettingsAction,
    onSettingsPrefetchAction: onSettingsPrefetch,
}: PlayerColumnProps) {
    const {
        playingNow,
        roomId,
        roomPassword,
        roomIsPlaying,
        currentTime,
        videoQueue,
        showQRInPlayer,
        captionsEnabled,
        captionsLanguage,
        captionTracks,
        captionTracksVideoId,
        volume,
        tvSuppressAutoCreate,
        setPlayer,
        setVolume,
        nextVideo,
        setIsPlaying,
    } = useYouTubeStore(
        useShallow((s) => ({
            playingNow: s.room?.playingNow,
            roomId: s.room?.id,
            roomPassword: s.room?.password,
            roomIsPlaying: s.room?.isPlaying ?? false,
            currentTime: s.room?.currentTime ?? 0,
            videoQueue: s.room?.videoQueue ?? EMPTY_VIDEO_QUEUE,
            showQRInPlayer: s.room?.showQRInPlayer ?? true,
            captionsEnabled: s.room?.captionsEnabled ?? false,
            captionsLanguage: s.room?.captionsLanguage ?? DEFAULT_CAPTION_LANGUAGE,
            captionTracks: s.room?.captionTracks ?? EMPTY_CAPTION_TRACKS,
            captionTracksVideoId: s.room?.captionTracksVideoId,
            volume: s.volume,
            tvSuppressAutoCreate: s.tvSuppressAutoCreate,
            setPlayer: s.setPlayer,
            setVolume: s.setVolume,
            nextVideo: s.nextVideo,
            setIsPlaying: s.setIsPlaying,
        })),
    );
    const t = useScopedI18n('youtubePage');
    const locale = useCurrentLocale();
    const { shouldShowTimer, setShouldShowTimer, cancelCountdown, resetCountdown } =
        useCountdownStore(
            useShallow((state) => ({
                shouldShowTimer: state.shouldShowTimer,
                setShouldShowTimer: state.setShouldShowTimer,
                cancelCountdown: state.cancelCountdown,
                resetCountdown: state.reset,
            })),
        );
    const { ensureConnectedAndSend } = useWebSocket();

    const skippedUnplayableRef = useRef<string | null>(null);
    const endedForVideoIdRef = useRef<string | null>(null);
    const captionSyncCleanupRef = useRef<(() => void) | null>(null);
    const prevPlayingNowIdRef = useRef<string | null>(null);
    /** Frozen `videoId` prop — track advances use `loadVideoById`, not react-youtube reset. */
    const embedSeedVideoIdRef = useRef<string | null>(null);
    /** Keep the YouTube iframe mounted (hidden) while TikTok plays so mixed queues can resume. */
    const [youtubeEmbedMounted, setYoutubeEmbedMounted] = useState(false);

    const showsPlayer = effectiveLayoutMode === 'player' || effectiveLayoutMode === 'both';
    const isTvPlayerIdle = Boolean(isTvViewport && showsPlayer && !playingNow);
    const isTvIdle = Boolean(isTvPlayerIdle && roomId);
    const isBothIdleLayout = effectiveLayoutMode === 'both' && isTvIdle;
    const showPlayerSettingsButton =
        effectiveLayoutMode === 'player' && !isTvPlayerIdle && hasFinePointer;

    const viewportWidth = useViewportWidth();
    const isNarrowViewport = viewportWidth > 0 && viewportWidth < TV_MIN_WIDTH_PX;
    const needsModeRecovery =
        effectiveLayoutMode === 'player' && (isNarrowViewport || !hasFinePointer);
    const showRecoveryModeBar = needsModeRecovery && (isTvPlayerIdle || Boolean(playingNow));
    const showCornerTvSwitch =
        isTvPlayerIdle && hasFinePointer && !isNarrowViewport && !needsModeRecovery;

    useEffect(() => {
        resetCountdown();
        endedForVideoIdRef.current = null;
    }, [playingNow?.id, resetCountdown]);

    useEffect(() => {
        skippedUnplayableRef.current = null;
        captionSyncCleanupRef.current?.();
        captionSyncCleanupRef.current = null;
    }, [playingNow?.id]);

    const playingNowId = playingNow?.id;
    const isTikTokNow = isTikTokPlayback({ video: playingNow });

    useEffect(() => {
        if (effectiveLayoutMode === 'remote' || !roomId || !playingNowId) {
            return;
        }
        if (isTikTokNow) {
            applyPlaybackIntent({
                video: playingNow,
                youtubePlayer: null,
                isPlaying: roomIsPlaying,
            });
            return;
        }
        const seedId = embedSeedVideoIdRef.current;
        if (seedId && playingNowId !== seedId) {
            return;
        }
        const player = useYouTubeStore.getState().player;
        if (!isYoutubePlayerUsable(player)) {
            return;
        }
        applyPlaybackIntent({
            video: playingNow,
            youtubePlayer: player,
            isPlaying: roomIsPlaying,
        });
    }, [effectiveLayoutMode, roomId, playingNowId, roomIsPlaying, isTikTokNow, playingNow]);

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
            setYoutubeEmbedMounted(false);
            setPlayer(null);
            return;
        }

        if (isTikTokNow) {
            prevPlayingNowIdRef.current = playingNowId;
            return;
        }

        if (!youtubeEmbedMounted) {
            embedSeedVideoIdRef.current = playingNowId;
            prevPlayingNowIdRef.current = playingNowId;
            setYoutubeEmbedMounted(true);
            return;
        }

        const prevId = prevPlayingNowIdRef.current;
        prevPlayingNowIdRef.current = playingNowId;

        if (!prevId || prevId === playingNowId) {
            return;
        }

        const player = useYouTubeStore.getState().player;
        if (!isYoutubePlayerUsable(player)) {
            return;
        }

        applyTrackToPlayer(player, playingNowId);
    }, [playingNowId, isTikTokNow, youtubeEmbedMounted, applyTrackToPlayer, setPlayer]);

    useEffect(() => {
        if (!isTikTokNow || !youtubeEmbedMounted) {
            return;
        }

        const player = useYouTubeStore.getState().player;
        if (isYoutubePlayerUsable(player)) {
            applyRoomPlaybackToPlayer(player, false);
        }
    }, [isTikTokNow, youtubeEmbedMounted]);

    useEffect(() => {
        const player = useYouTubeStore.getState().player;
        if (!isYoutubePlayerUsable(player)) {
            return;
        }
        applyYoutubeCaptions(player, {
            enabled: captionsEnabled,
            languageCode: captionsLanguage,
            tracks: captionTracks,
        });
    }, [captionsEnabled, captionsLanguage, captionTracks, captionTracksVideoId]);

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

        if (effectiveLayoutMode !== 'remote' && roomId && !shouldSuppressPlaybackBroadcast()) {
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
            if (!current || isVideoLive({ video: current })) {
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
        if (!currentVideoId || !roomId) {
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

    const handleEmbedEnded = useCallback(() => {
        const current = useYouTubeStore.getState().room?.playingNow;
        if (!current) {
            return;
        }
        endedForVideoIdRef.current = current.id;
        setShouldShowTimer(true);
    }, [setShouldShowTimer]);

    const handleSkipUnplayable = useCallback(
        (videoId: string) => {
            if (!roomId) {
                return;
            }
            if (skippedUnplayableRef.current === videoId) {
                return;
            }
            skippedUnplayableRef.current = videoId;
            ensureConnectedAndSend({ type: 'skipUnplayableVideo', videoId });
        },
        [ensureConnectedAndSend, roomId],
    );

    const playerSurface = (
        <div className="relative h-full w-full">
            {playingNow ? (
                <PlayerEmbedSurfaceMemo
                    playingNow={playingNow}
                    effectiveLayoutMode={effectiveLayoutMode}
                    roomId={roomId}
                    roomIsPlaying={roomIsPlaying}
                    currentTime={currentTime}
                    volume={volume}
                    captionsEnabled={captionsEnabled}
                    youtubeEmbedMounted={youtubeEmbedMounted}
                    embedSeedVideoId={embedSeedVideoIdRef.current}
                    isTikTokNow={isTikTokNow}
                    onYoutubeReadyAction={onPlayerReady}
                    onYoutubeStateChangeAction={onPlayerStateChange}
                    onYoutubeErrorAction={onPlayerError}
                    onEndedAction={handleEmbedEnded}
                    onSkipUnplayableAction={handleSkipUnplayable}
                    setIsPlaying={setIsPlaying}
                    ensureConnectedAndSend={ensureConnectedAndSend}
                />
            ) : (
                <div className="absolute inset-0 bg-zinc-950" aria-hidden />
            )}

            {isTvPlayerIdle && !roomId && tvSuppressAutoCreate && (
                <div className="absolute inset-0 z-[5] flex items-center justify-center bg-zinc-950">
                    {!isTvViewport ? (
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />
                    ) : null}
                    <div
                        className={cn(
                            'pointer-events-auto relative z-[1] max-h-full overflow-y-auto py-safe-offset',
                            showRecoveryModeBar && 'pb-28',
                        )}
                    >
                        <TvRoomLobby
                            compact={isBothIdleLayout}
                            onOpenSettingsAction={onOpenSettingsAction}
                        />
                    </div>
                </div>
            )}

            {isTvIdle && roomId && (
                <TvPlayerQrZone
                    roomId={roomId}
                    roomPassword={roomPassword}
                    disableLayoutMorph={isTvViewport}
                    locale={locale}
                    showQR={showQRInPlayer}
                    isIdle
                    compact={isBothIdleLayout}
                    reserveFooterSpace={showRecoveryModeBar}
                    onOpenSettingsAction={onOpenSettingsAction}
                />
            )}

            {isTvPlayerIdle && (
                <div className="pointer-events-auto absolute right-safe-offset top-safe-offset z-[6] flex items-center gap-3 sm:gap-4">
                    {showCornerTvSwitch ? (
                        <TvIdleLayoutSwitch effectiveLayoutMode={effectiveLayoutMode} />
                    ) : null}
                    <LanguageSwitcher variant="overlay" />
                </div>
            )}

            {showRecoveryModeBar ? (
                <div
                    className={cn(
                        'pointer-events-auto absolute inset-x-0 bottom-0 z-[6] border-t border-zinc-800/80 px-4 py-3 pb-safe-offset',
                        isTvViewport ? 'bg-zinc-950' : 'bg-zinc-950/95 backdrop-blur-sm',
                    )}
                >
                    <p
                        className={cn(
                            'mb-2 text-center',
                            isTvViewport ? 'text-sm text-zinc-300' : 'text-xs text-zinc-500',
                        )}
                    >
                        {t('tvIdleModeHint')}
                    </p>
                    <LayoutModeSwitch
                        tone="overlay-visible"
                        className="w-full"
                        choices={RECOVERY_MODE_CHOICES}
                    />
                </div>
            ) : null}

            {playingNow && shouldShowTimer && videoQueue.length > 0 && (
                <div
                    className={cn(
                        'absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center',
                        isTvViewport ? 'bg-black' : 'bg-black/85',
                    )}
                >
                    <h3 className="mb-4 text-xl font-semibold">{t('nextUp')}</h3>
                    <div className="flex w-full max-w-lg flex-col items-center gap-4 px-2">
                        <ControlsStageThumbnail
                            src={getVideoThumbnailUrl({ video: videoQueue[0], size: 'large' })}
                            videoId={videoQueue[0].id}
                            srcSet={getVideoThumbnailSrcSet({ video: videoQueue[0] })}
                            title={videoQueue[0].title}
                            flatOnTv={isTvViewport}
                        />
                        <div className="space-y-2">
                            <p
                                className={cn(
                                    'line-clamp-2 font-medium',
                                    isTvViewport && 'text-base text-white',
                                )}
                            >
                                {videoQueue[0].title}
                            </p>
                            <VideoChannels video={videoQueue[0]} tone="inverse" align="center" />
                            <p
                                className={cn(
                                    'text-sm',
                                    isTvViewport ? 'text-zinc-200' : 'text-muted-foreground',
                                )}
                            >
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
                {!isTvPlayerIdle && roomId && isTvViewport && showQRInPlayer && (
                    <TvPlayerQrZone
                        roomId={roomId}
                        roomPassword={roomPassword}
                        locale={locale}
                        showQR={showQRInPlayer}
                        isIdle={false}
                        disableLayoutMorph
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
    );

    if (isTvViewport) {
        return playerSurface;
    }

    return <LayoutGroup id="tv-player-qr">{playerSurface}</LayoutGroup>;
}

export const PlayerColumn = memo(PlayerColumnInner);
