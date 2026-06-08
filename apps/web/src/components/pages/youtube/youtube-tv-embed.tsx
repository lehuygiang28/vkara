'use client';

import YouTube from 'react-youtube';

import { cn } from '@/lib/utils';

type YoutubeTvEmbedProps = {
    videoId: string;
    /** Match room `isPlaying` so a paused room does not autoplay on load. */
    autoplay?: boolean;
    onReadyAction: (event: YT.PlayerEvent) => void;
    onStateChangeAction: (event: YT.PlayerEvent) => void;
    onErrorAction: (event: YT.OnErrorEvent) => void;
    className?: string;
    /** TV: no iframe controls (`controls=0`). Laptop: native YouTube controls. */
    variant?: 'tv' | 'laptop';
};

const BASE_PLAYER_VARS = {
    modestbranding: 1,
    playsinline: 1,
    rel: 0,
    iv_load_policy: 3,
    /** Always 0 — captions toggled at runtime via IFrame API (avoids iframe reset). */
    cc_load_policy: 0,
} as const;

/** TV embed — must run client-only so `origin` matches the page hosting the iframe. */
export function YoutubeTvEmbed({
    videoId,
    autoplay = true,
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
                        autoplay: autoplay ? 1 : 0,
                        ...BASE_PLAYER_VARS,
                        controls: isLaptop ? 1 : 0,
                        disablekb: isLaptop ? 0 : 1,
                        fs: isLaptop ? 1 : 0,
                    },
                }}
                onReady={onReadyAction}
                onStateChange={onStateChangeAction}
                onError={onErrorAction}
            />
        </div>
    );
}
