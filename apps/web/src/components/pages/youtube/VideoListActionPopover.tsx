'use client';

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';

type VideoListActionPopoverProps = {
    video: YouTubeVideo;
    onClose: () => void;
    children: ReactNode;
    className?: string;
};

/** Compact action sheet above bottom chrome — not a permanent bar. */
export function VideoListActionPopover({
    video,
    onClose,
    children,
    className,
}: VideoListActionPopoverProps) {
    const t = useScopedI18n('videoSearch');

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-40 touch-none bg-black/25"
                aria-label={t('closeActions')}
                onClick={onClose}
            />
            <div
                className={cn(
                    'pointer-events-none fixed inset-x-0 z-50 flex justify-center px-safe-offset',
                    className,
                )}
                style={{ bottom: 'var(--vkara-remote-floating-bottom)' }}
                role="dialog"
                aria-modal="true"
                aria-label={t('videoActions')}
            >
                <div
                    className={cn(
                        'pointer-events-auto mb-2 w-full max-w-lg',
                        'animate-in fade-in-0 slide-in-from-bottom-3 duration-200',
                        'rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-md',
                    )}
                >
                    <div className="mb-2.5 flex items-start gap-2.5">
                        <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md">
                            <img
                                src={video.thumbnail?.url}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        </div>
                        <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug">
                            {video.title}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground"
                            onClick={onClose}
                            aria-label={t('closeActions')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {children}
                </div>
            </div>
        </>
    );
}
