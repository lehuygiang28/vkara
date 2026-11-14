'use client';

import { useCallback } from 'react';
import { Star } from 'lucide-react';
import type { YouTubeVideo } from '@vkara/youtube';

import { toast } from '@/hooks/use-toast';
import { useScopedI18n } from '@/locales/client';
import { useCabinetStore } from '@/store/cabinetStore';

import type { VideoListAction } from './video-list-action-bar';
import type { VideoListActionHelpers } from './VideoList';

export function useCabinetSaveAction() {
    const t = useScopedI18n('videoCabinet');
    const toggle = useCabinetStore((state) => state.toggle);

    return useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers): VideoListAction => {
            const saved = useCabinetStore.getState().savedIds.has(video.id);
            return {
                id: 'cabinet',
                label: saved ? t('remove') : t('save'),
                buttonText: saved ? t('removeShort') : t('saveShort'),
                icon: <Star className={saved ? 'fill-current' : undefined} />,
                onClick: () => {
                    closeMenu();
                    const evicted = toggle(video);
                    if (evicted) {
                        toast({ title: t('evictedOldest'), variant: 'warning' });
                    }
                },
            };
        },
        [t, toggle],
    );
}
