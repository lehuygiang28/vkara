'use client';

import Image from 'next/image';

import { LiveBadge } from '@/components/youtube-live-badge';
import { cn } from '@/lib/utils';

interface ControlsStageThumbnailProps {
    src: string;
    title: string;
    srcSet?: string;
    isLive?: boolean;
    className?: string;
}

/** Full 16:9 YouTube thumbnail — scales up in the flex stage, capped at 92vw / 28rem. */
export function ControlsStageThumbnail({
    src,
    title,
    srcSet,
    isLive = false,
    className,
}: ControlsStageThumbnailProps) {
    return (
        <div
            className={cn(
                'relative aspect-video h-full w-auto max-h-full min-h-0 max-w-[min(92vw,28rem)]',
                'overflow-hidden rounded-xl shadow-2xl shadow-black/35 ring-1 ring-white/10',
                className,
            )}
        >
            <Image
                src={src}
                alt={title}
                fill
                sizes="(max-width: 768px) 92vw, 28rem"
                className="object-cover"
                unoptimized
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
