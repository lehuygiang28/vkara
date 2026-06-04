'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type VideoListThumbnailProps = {
    src?: string | null;
    alt?: string;
    fallback?: ReactNode;
    overlay?: ReactNode;
    className?: string;
};

/** Thumbnail frame shared by {@link VideoListItem} and curated playlist rows. */
export function VideoListThumbnail({
    src,
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
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        sizes="(max-width: 640px) 96px, 128px"
                        className="object-cover"
                        unoptimized
                    />
                    {overlay}
                </>
            ) : (
                fallback
            )}
        </div>
    );
}
