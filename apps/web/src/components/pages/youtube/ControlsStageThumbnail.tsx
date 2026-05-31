'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';

interface ControlsStageThumbnailProps {
    src: string;
    title: string;
    srcSet?: string;
    className?: string;
}

/** Full 16:9 YouTube thumbnail for the controls stage (no square crop). */
export function ControlsStageThumbnail({ src, title, srcSet, className }: ControlsStageThumbnailProps) {
    return (
        <div
            className={cn(
                'relative aspect-video w-[min(92vw,28rem)] max-w-full shrink-0 overflow-hidden rounded-xl',
                'shadow-2xl shadow-black/35 ring-1 ring-white/10',
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
        </div>
    );
}
