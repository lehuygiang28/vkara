'use client';

import { LiveBadge } from '@/components/youtube-live-badge';
import { YouTubeThumbnailImage } from '@/components/youtube-thumbnail-image';
import { cn } from '@/lib/utils';

interface ControlsStageThumbnailProps {
    src: string;
    videoId: string;
    title: string;
    srcSet?: string;
    isLive?: boolean;
    /** TV path: skip heavy shadow compositing. */
    flatOnTv?: boolean;
    className?: string;
}

/** Full 16:9 YouTube thumbnail — scales up in the flex stage, capped at 92vw / 28rem. */
export function ControlsStageThumbnail({
    src,
    videoId,
    title,
    srcSet,
    isLive = false,
    flatOnTv = false,
    className,
}: ControlsStageThumbnailProps) {
    return (
        <div
            className={cn(
                'relative aspect-video w-[min(92vw,28rem)] max-w-full shrink-0',
                'overflow-hidden rounded-xl ring-1 ring-white/10',
                flatOnTv ? 'shadow-none' : 'shadow-2xl shadow-black/35',
                className,
            )}
        >
            <YouTubeThumbnailImage
                src={src}
                videoId={videoId}
                size="large"
                alt={title}
                fill
                sizes="(max-width: 768px) 92vw, 28rem"
                className="object-cover"
                priority
                {...(srcSet ? { srcSet } : {})}
            />
            {isLive ? (
                <div className="absolute bottom-1 right-1">
                    <LiveBadge />
                </div>
            ) : null}
        </div>
    );
}
