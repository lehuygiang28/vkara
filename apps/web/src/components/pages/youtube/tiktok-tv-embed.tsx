'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
    applyRoomPlaybackToTikTok,
    applySeekToTikTok,
    applyTikTokVolume,
    buildTikTokPlayerSrc,
    getTikTokEmbedIsPlaying,
    handleTikTokPlayerMessage,
    registerTikTokIframe,
    resetTikTokPlaybackState,
    scheduleTikTokEmbedPauseSync,
    setTikTokEmbedPostType,
    setTikTokPlaybackEndHandler,
} from '@/lib/tiktok-playback-sync';
import { isPlayerPageHidden } from '@/lib/tiktok-room-playback';
import { needsPlaybackSeekCorrection } from '@vkara/room';
import { markServerPlaybackCommand } from '@/lib/youtube-playback-sync';
import { cn } from '@/lib/utils';

type TikTokTvEmbedProps = {
    videoId: string;
    autoplay: boolean;
    closedCaption?: boolean;
    isPhotoPost?: boolean;
    startSeconds?: number;
    volume?: number;
    className?: string;
    onReadyAction?: () => void;
    onEndedAction?: () => void;
    onPlayerErrorAction?: () => void;
    onPlayingChangeAction?: (detail: {
        playing: boolean;
        /** Captured when embed reports pause (TikTok auto-pauses on tab hide). */
        pausedWhileHidden?: boolean;
    }) => void;
};

export function TikTokTvEmbed({
    videoId,
    autoplay,
    closedCaption = false,
    isPhotoPost = false,
    startSeconds = 0,
    volume = 100,
    className,
    onReadyAction,
    onEndedAction,
    onPlayerErrorAction,
    onPlayingChangeAction,
}: TikTokTvEmbedProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const endedRef = useRef(false);
    const autoplayRef = useRef(autoplay);
    const volumeRef = useRef(volume);
    const startSecondsRef = useRef(startSeconds);
    const onReadyRef = useRef(onReadyAction);
    const onEndedRef = useRef(onEndedAction);
    const onPlayerErrorRef = useRef(onPlayerErrorAction);
    const onPlayingChangeRef = useRef(onPlayingChangeAction);

    autoplayRef.current = autoplay;
    volumeRef.current = volume;
    startSecondsRef.current = startSeconds;
    onReadyRef.current = onReadyAction;
    onEndedRef.current = onEndedAction;
    onPlayerErrorRef.current = onPlayerErrorAction;
    onPlayingChangeRef.current = onPlayingChangeAction;

    // autoplay=1 only in the initial src per video (new load). Same-video pause/resume uses postMessage
    // so toggling roomIsPlaying does not reload the embed (TikTok 403).
    const playerSrc = useMemo(
        () => buildTikTokPlayerSrc(videoId, { closedCaption, autoplay: true }),
        [videoId, closedCaption],
    );

    useEffect(() => {
        endedRef.current = false;
        resetTikTokPlaybackState();
        setTikTokEmbedPostType(isPhotoPost);
        setTikTokPlaybackEndHandler(() => {
            if (endedRef.current) {
                return;
            }
            endedRef.current = true;
            onEndedRef.current?.();
        });

        const onMessage = (event: MessageEvent) => {
            const data = event.data as {
                type?: string;
                value?: unknown;
                'x-tiktok-player'?: boolean;
            };
            if (!data || data['x-tiktok-player'] !== true || typeof data.type !== 'string') {
                return;
            }

            const message = {
                type: data.type,
                value: data.value,
                'x-tiktok-player': true as const,
            };
            handleTikTokPlayerMessage(message);

            if (data.type === 'onPlayerReady') {
                registerTikTokIframe(iframeRef.current);
                applyTikTokVolume(volumeRef.current);

                const seekTarget = startSecondsRef.current;
                if (seekTarget > 0 && needsPlaybackSeekCorrection(0, seekTarget)) {
                    markServerPlaybackCommand();
                    applySeekToTikTok(seekTarget);
                }

                applyRoomPlaybackToTikTok(autoplayRef.current && !isPlayerPageHidden());
                onReadyRef.current?.();
            }

            if (data.type === 'onStateChange') {
                if (data.value === 1) {
                    onPlayingChangeRef.current?.({ playing: true });
                }
                if (data.value === 2) {
                    const pausedWhileHidden = isPlayerPageHidden();
                    scheduleTikTokEmbedPauseSync(() => {
                        if (getTikTokEmbedIsPlaying()) {
                            return;
                        }
                        onPlayingChangeRef.current?.({ playing: false, pausedWhileHidden });
                    });
                }
            }

            if (data.type === 'onPlayerError') {
                onPlayerErrorRef.current?.();
            }
        };

        window.addEventListener('message', onMessage);
        return () => {
            window.removeEventListener('message', onMessage);
            setTikTokPlaybackEndHandler(null);
            registerTikTokIframe(null);
            resetTikTokPlaybackState();
        };
    }, [videoId, isPhotoPost, closedCaption]);

    useEffect(() => {
        if (autoplay && isPlayerPageHidden()) {
            return;
        }
        applyRoomPlaybackToTikTok(autoplay);
    }, [autoplay, videoId]);

    useEffect(() => {
        applyTikTokVolume(volume);
    }, [volume]);

    const handleIframeLoad = () => {
        registerTikTokIframe(iframeRef.current);
    };

    return (
        <iframe
            ref={iframeRef}
            key={`${videoId}-cc-${closedCaption ? 1 : 0}`}
            title={`TikTok video ${videoId}`}
            src={playerSrc}
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={handleIframeLoad}
            className={cn('h-full w-full border-0 bg-black', className)}
        />
    );
}
