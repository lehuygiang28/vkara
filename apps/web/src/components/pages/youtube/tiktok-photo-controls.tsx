'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { getTikTokPhotoMaxIndex } from '@vkara/tiktok';

import { useYouTubeStore } from '@/store/youtubeStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function useTikTokPhotoIndex(active: boolean) {
    const playingNow = useYouTubeStore((s) => s.room?.playingNow);
    const index = useYouTubeStore((s) => (active ? (s.room?.tiktokPhotoIndex ?? 0) : 0));
    const roomMaxIndex = useYouTubeStore((s) => (active ? (s.room?.tiktokPhotoMaxIndex ?? 0) : 0));
    const maxIndex =
        active && playingNow ? getTikTokPhotoMaxIndex({ video: playingNow, roomMaxIndex }) : 0;
    return { index, maxIndex };
}

type TikTokPhotoNavigationBarProps = {
    index: number;
    maxIndex: number;
    prevLabel: string;
    nextLabel: string;
    onNavigateAction: (delta: -1 | 1) => void;
    className?: string;
};

/**
 * Replaces {@link PlaybackScrubber} for TikTok photo posts: prev / counter / next
 * in the same slot above transport controls.
 */
export function TikTokPhotoNavigationBar({
    index,
    maxIndex,
    prevLabel,
    nextLabel,
    onNavigateAction: onNavigate,
    className,
}: TikTokPhotoNavigationBarProps) {
    const slideLabel = maxIndex > 0 ? `${index + 1} / ${maxIndex + 1}` : `${index + 1}`;
    const atMin = index <= 0;
    const atMax = maxIndex > 0 && index >= maxIndex;
    const dotCount = maxIndex > 0 ? maxIndex + 1 : 0;
    const showDots = dotCount > 1 && dotCount <= 12;

    return (
        <div className={cn('w-full select-none', className)} role="group" aria-label={slideLabel}>
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/25 px-2 py-2.5 min-[400px]:gap-3 min-[400px]:px-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                    onClick={() => onNavigate(-1)}
                    disabled={atMin}
                    aria-label={prevLabel}
                >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                </Button>

                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    {showDots ? (
                        <div
                            className="flex max-w-full flex-wrap items-center justify-center gap-1.5"
                            aria-hidden
                        >
                            {Array.from({ length: dotCount }, (_, i) => (
                                <span
                                    key={i}
                                    className={cn(
                                        'h-1.5 rounded-full transition-all duration-200',
                                        i === index
                                            ? 'w-5 bg-foreground'
                                            : 'w-1.5 bg-muted-foreground/35',
                                    )}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="h-1.5 w-full max-w-[10rem] rounded-full bg-muted-foreground/15"
                            aria-hidden
                        >
                            <div
                                className="h-full rounded-full bg-foreground/70 transition-[width] duration-200"
                                style={{
                                    width:
                                        maxIndex > 0
                                            ? `${((index + 1) / (maxIndex + 1)) * 100}%`
                                            : '100%',
                                }}
                            />
                        </div>
                    )}

                    <p className="text-sm font-semibold tabular-nums tracking-tight">
                        {slideLabel}
                    </p>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                    onClick={() => onNavigate(1)}
                    disabled={atMax}
                    aria-label={nextLabel}
                >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                </Button>
            </div>
        </div>
    );
}
