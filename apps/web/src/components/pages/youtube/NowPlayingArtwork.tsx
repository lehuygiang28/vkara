'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';

import { isTikTokThumbnailVideo } from '@vkara/tiktok';
import { YouTubeThumbnailImage } from '@/components/youtube-thumbnail-image';
import { cn } from '@/lib/utils';

/** Scales 44px → 56px by viewport width; stable across iPhone SE through Pro Max. */
const THUMB_SIZE_CLASS = 'size-[clamp(2.75rem,12vw,3.5rem)]';

type NowPlayingArtworkProps = {
    src: string;
    videoId: string;
    title: string;
    videoUrl?: string;
    thumbnails?: { url: string }[];
    source?: 'youtube' | 'tiktok';
    isPlaying: boolean;
    isLive: boolean;
    className?: string;
};

function EqualizerBars({ tone }: { tone: 'primary' | 'live' }) {
    const barClass = tone === 'live' ? 'bg-red-400' : 'bg-primary';

    return (
        <span className="flex h-3.5 items-end justify-center gap-[2px]" aria-hidden>
            <span className={cn('now-playing-eq-bar h-full w-[3px] rounded-full', barClass)} />
            <span
                className={cn(
                    'now-playing-eq-bar now-playing-eq-bar-2 h-full w-[3px] rounded-full',
                    barClass,
                )}
            />
            <span
                className={cn(
                    'now-playing-eq-bar now-playing-eq-bar-3 h-full w-[3px] rounded-full',
                    barClass,
                )}
            />
        </span>
    );
}

export function NowPlayingArtwork({
    src,
    videoId,
    title,
    videoUrl,
    thumbnails,
    source,
    isPlaying,
    isLive,
    className,
}: NowPlayingArtworkProps) {
    const useTikTokImage = isTikTokThumbnailVideo({
        url: videoUrl ?? '',
        thumbnails: thumbnails ?? (src ? [{ url: src }] : []),
        source,
    });
    const tone = isLive ? 'live' : 'primary';
    const imageClassName = cn(
        'object-cover object-center transition-opacity duration-200',
        !isPlaying && 'opacity-50',
    );
    const ringClass = isPlaying
        ? isLive
            ? 'ring-red-500 shadow-[0_0_0_1px_hsl(0_72%_51%/0.35),0_0_14px_hsl(0_72%_51%/0.22)]'
            : 'ring-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_14px_hsl(var(--primary)/0.2)]'
        : 'ring-muted-foreground/35 shadow-none';

    return (
        <div className={cn('relative shrink-0 p-[3px]', className)} aria-hidden>
            <div className={cn('relative aspect-square', THUMB_SIZE_CLASS)}>
                {isPlaying ? (
                    <span
                        className={cn(
                            'pointer-events-none absolute -inset-[3px] rounded-lg now-playing-ring-pulse',
                            isLive ? 'border border-red-500/40' : 'border border-primary/35',
                        )}
                    />
                ) : null}

                <div
                    className={cn(
                        'relative h-full w-full overflow-hidden rounded-md ring-2 ring-offset-1 ring-offset-background transition-[box-shadow,ring-color] duration-200',
                        ringClass,
                    )}
                >
                    {useTikTokImage && src ? (
                        <Image
                            src={src}
                            alt=""
                            fill
                            sizes="(max-width: 390px) 48px, 56px"
                            className={imageClassName}
                            unoptimized
                        />
                    ) : (
                        <YouTubeThumbnailImage
                            src={src}
                            videoId={videoId}
                            size="list"
                            alt=""
                            fill
                            sizes="(max-width: 390px) 48px, 56px"
                            className={imageClassName}
                        />
                    )}

                    {!isPlaying ? (
                        <>
                            <span className="pointer-events-none absolute inset-0 bg-black/30" />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 ring-1 ring-white/20">
                                    <Play
                                        className="ml-0.5 h-3 w-3 text-white"
                                        fill="currentColor"
                                        strokeWidth={0}
                                    />
                                </span>
                            </span>
                        </>
                    ) : (
                        <span
                            className={cn(
                                'absolute bottom-1 right-1 flex min-h-[18px] min-w-[22px] items-center justify-center rounded-md px-1 py-0.5',
                                'border border-white/10 bg-black/70 backdrop-blur-sm',
                            )}
                        >
                            <EqualizerBars tone={tone} />
                        </span>
                    )}
                </div>
            </div>

            <span className="sr-only">
                {title}
                {isPlaying ? (isLive ? ', live' : ', playing') : ', paused'}
            </span>
        </div>
    );
}
