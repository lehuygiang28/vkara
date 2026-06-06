'use client';

import Image, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { getNextYouTubeThumbnailFallback, isYouTubeThumbnailPlaceholder } from '@vkara/youtube';

type YouTubeThumbnailImageProps = Omit<ImageProps, 'src' | 'onError' | 'onLoad'> & {
    src: string;
    videoId: string;
    size: 'list' | 'large';
    /** Passed through to the underlying img; omitted from Next.js ImageProps. */
    srcSet?: string;
};

/** Next/Image wrapper that steps down maxres → sd → hq → mq when a slot 404s. */
export function YouTubeThumbnailImage({
    src: initialSrc,
    videoId,
    size,
    srcSet: initialSrcSet,
    alt,
    ...imageProps
}: YouTubeThumbnailImageProps) {
    const [src, setSrc] = useState(initialSrc);
    const [srcSet, setSrcSet] = useState(initialSrcSet);

    useEffect(() => {
        setSrc(initialSrc);
        setSrcSet(initialSrcSet);
    }, [initialSrc, initialSrcSet, videoId]);

    const fallbackToNext = useCallback(
        (currentUrl: string) => {
            const next = getNextYouTubeThumbnailFallback(currentUrl, videoId, size);
            if (next && next !== currentUrl) {
                setSrcSet(undefined);
                setSrc(next);
                return true;
            }
            return false;
        },
        [videoId, size],
    );

    const onError = useCallback(
        (event: React.SyntheticEvent<HTMLImageElement>) => {
            const img = event.currentTarget;
            fallbackToNext(img.currentSrc || img.src);
        },
        [fallbackToNext],
    );

    const onLoad = useCallback(
        (event: React.SyntheticEvent<HTMLImageElement>) => {
            const img = event.currentTarget;
            const loadedUrl = img.currentSrc || img.src;
            if (isYouTubeThumbnailPlaceholder(img.naturalWidth, loadedUrl)) {
                fallbackToNext(loadedUrl);
            }
        },
        [fallbackToNext],
    );

    return (
        <Image
            {...imageProps}
            alt={alt}
            src={src}
            {...(srcSet ? { srcSet } : {})}
            onLoad={onLoad}
            onError={onError}
            unoptimized
        />
    );
}
