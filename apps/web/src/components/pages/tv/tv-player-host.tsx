'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { type CaptionTrack, DEFAULT_CAPTION_LANGUAGE } from '@vkara/youtube';
import { needsPlaybackSeekCorrection } from '@vkara/room';
import { isVideoLive } from '@vkara/tiktok';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';
import { useCountdownStore } from '@/store/countdownTimersStore';
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
import { useYouTubeStore } from '@/store/youtubeStore';
import { PlayerEmbedSurfaceMemo } from '@/components/player/player-embed-surface';
import { TvPlayerQrZone } from '@/components/pages/youtube/TvPlayerQrZone';
import { TvEmbedFocusGuard } from '@/components/pages/tv/tv-embed-focus-guard';
import { TvNextUpOverlay } from '@/components/pages/tv/tv-next-up-overlay';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { usePlayerAction } from '@/hooks/use-player-action';

const EMPTY_CAPTION_TRACKS: CaptionTrack[] = [];
const EMPTY_VIDEO_QUEUE: import('@vkara/youtube').YouTubeVideo[] = [];

type TvPlayerHostProps = {
    onOpenSettingsAction: () => void;
    controlsVisible?: boolean;
};

function TvPlayerHostInner({ onOpenSettingsAction, controlsVisible = false }: TvPlayerHostProps) {
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
            setPlayer: s.setPlayer,
            setVolume: s.setVolume,
            nextVideo: s.nextVideo,
            setIsPlaying: s.setIsPlaying,
        })),
    );

    const locale = useCurrentLocale();
    const { handleReplayVideo } = usePlayerAction();
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
    const embedSeedVideoIdRef = useRef<string | null>(null);
    const [youtubeEmbedMounted, setYoutubeEmbedMounted] = useState(false);

    const isTvIdle = Boolean(roomId && !playingNow);
    const playingNowId = playingNow?.id;
    const isTikTokNow = isTikTokPlayback({ video: playingNow });

    useEffect(() => {
        resetCountdown();
        endedForVideoIdRef.current = null;
    }, [playingNow?.id, resetCountdown]);

    useEffect(() => {
        skippedUnplayableRef.current = null;
        captionSyncCleanupRef.current?.();
        captionSyncCleanupRef.current = null;
    }, [playingNow?.id]);

    useEffect(() => {
        if (!roomId || !playingNowId) {
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
    }, [roomId, playingNowId, roomIsPlaying, isTikTokNow, playingNow]);

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

        if (roomId && !shouldSuppressPlaybackBroadcast()) {
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

    const dismissNextUp = useCallback(() => {
        cancelCountdown();
        endedForVideoIdRef.current = null;
    }, [cancelCountdown]);

    const handleNextUpReplay = useCallback(() => {
        dismissNextUp();
        handleReplayVideo();
    }, [dismissNextUp, handleReplayVideo]);

    const showNextUpOverlay = Boolean(playingNow && shouldShowTimer && videoQueue.length > 0);
    const nextQueuedVideo = videoQueue[0];

    return (
        <div className="absolute inset-0 bg-black">
            {playingNow ? (
                <PlayerEmbedSurfaceMemo
                    playingNow={playingNow}
                    effectiveLayoutMode="player"
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
                    embedVariant="tv"
                />
            ) : (
                <div className="absolute inset-0 bg-[#0f0f0f]" aria-hidden />
            )}

            {isTvIdle && roomId ? (
                <TvPlayerQrZone
                    roomId={roomId}
                    roomPassword={roomPassword}
                    locale={locale}
                    showQR={showQRInPlayer}
                    isIdle
                    disableLayoutMorph
                    spatialFocusKey={TV_FOCUS_KEYS.idleQr}
                    spatialFocusOnMount
                    onOpenSettingsAction={onOpenSettingsAction}
                />
            ) : null}

            {playingNow ? (
                <TvEmbedFocusGuard controlsVisible={controlsVisible && !showNextUpOverlay} />
            ) : null}

            {showNextUpOverlay && nextQueuedVideo ? (
                <TvNextUpOverlay
                    nextVideo={nextQueuedVideo}
                    onPlayNextAction={handleVideoFinished}
                    onReplayAction={handleNextUpReplay}
                    onCountdownCompleteAction={handleVideoFinished}
                />
            ) : null}
        </div>
    );
}

export const TvPlayerHost = memo(TvPlayerHostInner);
