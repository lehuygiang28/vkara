'use client';

import React, { useState } from 'react';
import { Play, ListVideo, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { TooltipButton } from '@/components/tooltip-button';
import { VideoList } from './VideoList';

export function VideoHistory() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const { handlePlayVideoNow, handleAddVideoToQueue, handleClearHistory } = usePlayerAction();
    const { room } = useYouTubeStore();
    const t = useScopedI18n('videoHistory');

    function renderButtons(video: YouTubeVideo) {
        return (
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    selectedVideo === video.id ? 'max-h-20 mt-2 opacity-100' : 'max-h-0 opacity-0',
                )}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <TooltipButton
                        tooltipContent={t('playNow')}
                        buttonText={t('playNow')}
                        icon={<Play className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handlePlayVideoNow(video)}
                    />

                    <TooltipButton
                        tooltipContent={t('addToQueue')}
                        buttonText={t('addToQueue')}
                        icon={<ListVideo className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handleAddVideoToQueue(video)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {(room?.historyQueue?.length || 0) > 0 && (
                <div className="flex items-center justify-center p-2 bg-background shadow-sm">
                    <div className="flex items-center space-x-2">
                        <TooltipButton
                            tooltipContent={t('clearHistory')}
                            buttonText={t('clearHistory')}
                            icon={<X className="h-3.5 w-3.5 mr-1" />}
                            onConfirm={handleClearHistory}
                            variant={'destructive'}
                            confirmMode
                            confirmContent={t('clearHistoryConfirm')}
                        />
                    </div>
                </div>
            )}
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
