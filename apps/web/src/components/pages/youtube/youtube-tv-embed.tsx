'use client';

import YouTube from 'react-youtube';

type YoutubeTvEmbedProps = {
    videoId: string;
    onReadyAction: (event: YT.PlayerEvent) => void;
    onStateChangeAction: (event: YT.PlayerEvent) => void;
    onErrorAction: (event: YT.OnErrorEvent) => void;
    className?: string;
};

/** TV embed — must run client-only so `origin` matches the page hosting the iframe. */
export function YoutubeTvEmbed({
    videoId,
    onReadyAction,
    onStateChangeAction,
    onErrorAction,
    className,
}: YoutubeTvEmbedProps) {
    const playerOrigin = window.location.origin;

    return (
        <YouTube
            videoId={videoId}
            opts={{
                height: '100%',
                width: '100%',
                host: 'https://www.youtube-nocookie.com',
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    playsinline: 1,
                    cc_load_policy: 0,
                    iv_load_policy: 3,
                    origin: playerOrigin,
                },
            }}
            onReady={onReadyAction}
            onStateChange={onStateChangeAction}
            onError={onErrorAction}
            className={className}
        />
    );
}
