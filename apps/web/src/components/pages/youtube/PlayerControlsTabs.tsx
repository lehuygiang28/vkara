'use client';

import { Search, SlidersVertical } from 'lucide-react';

import { getYouTubeThumbnailUrl } from '@vkara/shared-utils';
import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';

import { Button } from '@/components/ui/button';
import { ControlsAmbientBackdrop } from './ControlsAmbientBackdrop';
import { ControlsNowPlayingMeta } from './ControlsNowPlayingMeta';
import { ControlsThumbDeck } from './ControlsThumbDeck';

export function PlayerControlsTabs() {
    const t = useScopedI18n('youtubePage');
    const { room, setCurrentTab } = useYouTubeStore();
    const playing = room?.playingNow;

    if (!playing) {
        return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-safe-offset pt-safe-offset">
                <div className="flex min-h-0 flex-1 flex-col items-center justify-end gap-4 px-2 pb-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <SlidersVertical className="h-8 w-8 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="max-w-xs space-y-2">
                        <h2 className="text-lg font-semibold">{t('controlsEmptyTitle')}</h2>
                        <p className="text-sm text-muted-foreground">{t('controlsEmptyDescription')}</p>
                    </div>
                    <div className="flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button type="button" variant="default" className="min-h-11" onClick={() => setCurrentTab('search')}>
                            <Search className="mr-2 h-4 w-4" />
                            {t('openSearch')}
                        </Button>
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setCurrentTab('queue')}>
                            {t('openQueue')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <ControlsAmbientBackdrop
                src={getYouTubeThumbnailUrl(playing.thumbnails, 'large', playing.id)}
            />

            <div className="relative z-10 flex min-h-0 flex-1 flex-col px-safe-offset pt-safe-offset">
                <ControlsNowPlayingMeta />
                <ControlsThumbDeck />
            </div>
        </div>
    );
}
