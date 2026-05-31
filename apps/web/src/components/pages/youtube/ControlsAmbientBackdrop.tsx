'use client';

import Image from 'next/image';

interface ControlsAmbientBackdropProps {
    src: string;
}

/**
 * Spotify / Apple Music-style ambient wash from the now-playing thumbnail.
 */
export function ControlsAmbientBackdrop({ src }: ControlsAmbientBackdropProps) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <Image
                src={src}
                alt=""
                fill
                sizes="100vw"
                className="scale-[1.35] object-cover opacity-45 saturate-[1.65] blur-3xl"
                unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/60 to-background" />
        </div>
    );
}
