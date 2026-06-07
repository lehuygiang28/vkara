'use client';

import dynamic from 'next/dynamic';
import { memo } from 'react';

import type { RawClientMessage } from '@vkara/room';
import type { YouTubeVideo } from '@vkara/youtube';
import { isTikTokPlayback } from '@/lib/active-playback';
import { broadcastTikTokPauseToRoom, isPlayerPageHidden } from '@/lib/tiktok-room-playback';
import { markServerPlaybackCommand } from '@/lib/youtube-playback-sync';
import { isTikTokPhotoPost, isVideoLive } from '@vkara/tiktok';
import { useYouTubeStore } from '@/store/youtubeStore';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';

const YoutubeTvEmbed = dynamic(
    () => import('./youtube-tv-embed').then((mod) => mod.YoutubeTvEmbed),
    { ssr: false },
);

const TikTokTvEmbed = dynamic(() => import('./tiktok-tv-embed').then((mod) => mod.TikTokTvEmbed), {
    ssr: false,
});

type PlayerEmbedSurfaceProps = {
    playingNow: YouTubeVideo;
    effectiveLayoutMode: YouTubeStoreLayoutMode;
    roomId: string | undefined;
    roomIsPlaying: boolean;
    currentTime: number;
    volume: number;
    captionsEnabled: boolean;
    youtubeEmbedMounted: boolean;
    embedSeedVideoId: string | null;
    isTikTokNow: boolean;
    onYoutubeReadyAction: (event: YT.PlayerEvent) => void;
    onYoutubeStateChangeAction: (event: YT.PlayerEvent) => void;
    onYoutubeErrorAction: (event: YT.OnErrorEvent) => void;
    onEndedAction: () => void;
    onSkipUnplayableAction: (videoId: string) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    ensureConnectedAndSend: (message: RawClientMessage) => void;
};

function PlayerEmbedSurface({
    playingNow,
    effectiveLayoutMode,
    roomId,
    roomIsPlaying,
    currentTime,
    volume,
    captionsEnabled,
    youtubeEmbedMounted,
    embedSeedVideoId,
    isTikTokNow,
    onYoutubeReadyAction,
    onYoutubeStateChangeAction,
    onYoutubeErrorAction,
    onEndedAction,
    onSkipUnplayableAction,
    setIsPlaying,
    ensureConnectedAndSend,
}: PlayerEmbedSurfaceProps) {
    return (
        <>
            {youtubeEmbedMounted ? (
                <div
                    className={
                        isTikTokNow
                            ? 'pointer-events-none absolute inset-0 hidden'
                            : 'absolute inset-0'
                    }
                    aria-hidden={isTikTokNow}
                >
                    <YoutubeTvEmbed
                        videoId={embedSeedVideoId ?? playingNow.id}
                        autoplay={roomIsPlaying}
                        onReadyAction={onYoutubeReadyAction}
                        onStateChangeAction={onYoutubeStateChangeAction}
                        onErrorAction={onYoutubeErrorAction}
                        className="absolute inset-0"
                        variant={effectiveLayoutMode === 'both' ? 'laptop' : 'tv'}
                    />
                </div>
            ) : null}
            {isTikTokNow ? (
                <TikTokTvEmbed
                    key={`tiktok-${playingNow.id}-${captionsEnabled ? 'cc' : 'no-cc'}`}
                    videoId={playingNow.id}
                    autoplay={roomIsPlaying}
                    closedCaption={captionsEnabled}
                    isPhotoPost={isTikTokPhotoPost({ video: playingNow })}
                    startSeconds={currentTime}
                    volume={volume}
                    className="absolute inset-0"
                    onPlayingChangeAction={(playing) => {
                        if (effectiveLayoutMode === 'remote' || !roomId) {
                            return;
                        }

                        if (!playing) {
                            const { room } = useYouTubeStore.getState();
                            if (!room?.isPlaying) {
                                return;
                            }

                            broadcastTikTokPauseToRoom({
                                videoId: playingNow.id,
                                ensureConnectedAndSend,
                                resumeWhenVisible: isPlayerPageHidden(),
                            });
                            return;
                        }

                        const serverPlaying = useYouTubeStore.getState().room?.isPlaying ?? false;
                        if (!serverPlaying) {
                            markServerPlaybackCommand();
                            ensureConnectedAndSend({ type: 'play' });
                            setIsPlaying(true);
                        }
                    }}
                    onEndedAction={() => {
                        if (!isVideoLive({ video: playingNow })) {
                            onEndedAction();
                        }
                    }}
                    onPlayerErrorAction={() => {
                        onSkipUnplayableAction(playingNow.id);
                    }}
                />
            ) : null}
        </>
    );
}

export const PlayerEmbedSurfaceMemo = memo(PlayerEmbedSurface);

export function shouldMountYoutubeEmbed({
    video,
}: {
    video: YouTubeVideo | null | undefined;
}): boolean {
    return Boolean(video && !isTikTokPlayback({ video }));
}
