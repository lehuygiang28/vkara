'use client';

import YouTube from 'react-youtube';

import { cn } from '@/lib/utils';

type YoutubeTvEmbedProps = {
    videoId: string;
    captionsEnabled?: boolean;
    onReadyAction: (event: YT.PlayerEvent) => void;
    onStateChangeAction: (event: YT.PlayerEvent) => void;
    onErrorAction: (event: YT.OnErrorEvent) => void;
    className?: string;
    /** TV: no iframe controls, pointer blocked. Laptop: native YouTube controls. */
    variant?: 'tv' | 'laptop';
};

const BASE_PLAYER_VARS = {
    modestbranding: 1,
    playsinline: 1,
    rel: 0,
    iv_load_policy: 3,
} as const;

/** TV embed — must run client-only so `origin` matches the page hosting the iframe. */
export function YoutubeTvEmbed({
    videoId,
    captionsEnabled = false,
    onReadyAction,
    onStateChangeAction,
    onErrorAction,
    className,
    variant = 'tv',
}: YoutubeTvEmbedProps) {
    const playerOrigin = window.location.origin;
    const isLaptop = variant === 'laptop';

    return (
        <div className={cn('relative', className)}>
            <YouTube
                videoId={videoId}
                className="h-full w-full [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full"
                opts={{
                    height: '100%',
                    width: '100%',
                    host: 'https://www.youtube-nocookie.com',
                    playerVars: {
                        origin: playerOrigin,
                        autoplay: 1,
                        ...BASE_PLAYER_VARS,
                        cc_load_policy: captionsEnabled ? 1 : 0,
                        controls: isLaptop ? 1 : 0,
                        disablekb: isLaptop ? 0 : 1,
                        fs: isLaptop ? 1 : 0,
                    },
                }}
                onReady={onReadyAction}
                onStateChange={onStateChangeAction}
                onError={onErrorAction}
            />
            {!isLaptop ? <div className="absolute inset-0 z-10" aria-hidden /> : null}
        </div>
    );
}
