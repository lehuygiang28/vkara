'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { YouTubeThumbnailImage } from '@/components/youtube-thumbnail-image';
import { cn } from '@/lib/utils';

type VideoListThumbnailProps = {
    src?: string | null;
    videoId?: string;
    alt?: string;
    fallback?: ReactNode;
    overlay?: ReactNode;
    className?: string;
};

/** Thumbnail frame shared by {@link VideoListItem} and curated playlist rows. */
export function VideoListThumbnail({
    src,
    videoId,
    alt = '',
    fallback,
    overlay,
    className,
}: VideoListThumbnailProps) {
    return (
        <div
            className={cn(
                'relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:w-32',
                className,
            )}
        >
            {src ? (
                <>
                    {videoId ? (
                        <YouTubeThumbnailImage
                            src={src}
                            videoId={videoId}
                            size="list"
                            alt={alt}
                            fill
                            sizes="(max-width: 640px) 96px, 128px"
                            className="object-cover"
                        />
                    ) : (
                        <Image
                            src={src}
                            alt={alt}
                            fill
                            sizes="(max-width: 640px) 96px, 128px"
                            className="object-cover"
                            unoptimized
                        />
                    )}
                    {overlay}
                </>
            ) : (
                fallback
            )}
        </div>
    );
}
