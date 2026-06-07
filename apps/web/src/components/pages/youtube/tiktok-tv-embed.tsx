'use client';

import { useEffect, useRef } from 'react';

import {
    applyRoomPlaybackToTikTok,
    applySeekToTikTok,
    applyTikTokVolume,
    buildTikTokPlayerSrc,
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
    onPlayingChangeAction?: (playing: boolean) => void;
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

                applyRoomPlaybackToTikTok(
                    autoplayRef.current && !isPlayerPageHidden(),
                );
                onReadyRef.current?.();
            }

            if (data.type === 'onStateChange') {
                if (data.value === 1) {
                    onPlayingChangeRef.current?.(true);
                }
                if (data.value === 2) {
                    scheduleTikTokEmbedPauseSync(() => {
                        onPlayingChangeRef.current?.(false);
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
    }, [autoplay]);

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
            src={buildTikTokPlayerSrc(videoId, { autoplay, closedCaption })}
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={handleIframeLoad}
            className={cn('h-full w-full border-0 bg-black', className)}
        />
    );
}
