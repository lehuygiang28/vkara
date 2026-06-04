'use client';

import { useCallback } from 'react';
import { ListPlus, MoveUp, Play } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import type { YouTubeVideo } from '@vkara/youtube';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoListActionBar } from './video-list-action-bar';
import type { VideoListActionHelpers } from './VideoList';

/** Play/queue row actions for search + browse suggestion lists. */
export function useVideoSearchListActions() {
    const t = useScopedI18n('videoSearch');
    const recordEngagement = usePersonalizationStore((state) => state.recordEngagement);
    const { handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop } =
        usePlayerAction();

    return useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'play',
                        label: t('playNow'),
                        buttonText: t('playNowShort'),
                        icon: <Play />,
                        tone: 'success',
                        onClick: () => {
                            closeMenu();
                            recordEngagement(video, 'play');
                            handlePlayVideoNow(video);
                        },
                    },
                    {
                        id: 'queue',
                        label: t('addToQueue'),
                        buttonText: t('addToQueueShort'),
                        icon: <ListPlus />,
                        tone: 'default',
                        onClick: () => {
                            closeMenu();
                            recordEngagement(video, 'queue');
                            handleAddVideoToQueue(video);
                        },
                    },
                    {
                        id: 'priority',
                        label: t('addVideoAndMoveToTop'),
                        buttonText: t('addVideoAndMoveToTopShort'),
                        icon: <MoveUp />,
                        tone: 'priority',
                        onClick: () => {
                            closeMenu();
                            recordEngagement(video, 'queue');
                            handleAddVideoAndMoveToTop(video);
                        },
                    },
                ]}
            />
        ),
        [t, recordEngagement, handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop],
    );
}
