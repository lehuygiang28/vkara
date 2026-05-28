'use client';

import React, { useState } from 'react';
import { Play, ListVideo, X } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { TooltipButton } from '@/components/tooltip-button';
import { VideoList } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListToolbar } from './video-list-toolbar';

export function VideoHistory() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const { handlePlayVideoNow, handleAddVideoToQueue, handleClearHistory } = usePlayerAction();
    const { room } = useYouTubeStore();
    const t = useScopedI18n('videoHistory');

    function renderButtons(video: YouTubeVideo) {
        return (
            <VideoListActionBar
                actions={[
                    {
                        id: 'play',
                        label: t('playNow'),
                        buttonText: t('playNowShort'),
                        icon: <Play />,
                        tone: 'success',
                        onClick: () => {
                            setSelectedVideo(null);
                            handlePlayVideoNow(video);
                        },
                    },
                    {
                        id: 'queue',
                        label: t('addToQueue'),
                        buttonText: t('addToQueueShort'),
                        icon: <ListVideo />,
                        tone: 'default',
                        onClick: () => {
                            setSelectedVideo(null);
                            handleAddVideoToQueue(video);
                        },
                    },
                ]}
            />
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {(room?.historyQueue?.length || 0) > 0 ? (
                <VideoListToolbar>
                    <TooltipButton
                        tooltipContent={t('clearHistory')}
                        buttonText={t('clearHistory')}
                        icon={<X />}
                        onConfirm={handleClearHistory}
                        confirmMode
                        confirmContent={t('clearHistoryConfirm')}
                        variant="destructive"
                    />
                </VideoListToolbar>
            ) : null}
            <VideoList
                keyPrefix={'history-list'}
                videos={room?.historyQueue || []}
                emptyMessage={t('noHistory')}
                renderButtons={renderButtons}
                onVideoClick={(video) => setSelectedVideo(video.id)}
                selectedVideoId={selectedVideo}
            />
        </div>
    );
}
