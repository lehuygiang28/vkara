'use client';

import React, { useState } from 'react';
import { Trash2, MoveUp, Shuffle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { TooltipButton } from '@/components/tooltip-button';
import { VideoList } from './VideoList';

export function VideoQueue() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const { room } = useYouTubeStore();
    const {
        handleRemoveVideoFromQueue,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
    } = usePlayerAction();
    const t = useScopedI18n('videoQueue');

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
                        tooltipContent={t('moveToTop')}
                        buttonText={t('moveToTop')}
                        icon={<MoveUp className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handleMoveVideoToTop(video)}
                    />

                    <TooltipButton
                        tooltipContent={t('remove')}
                        buttonText={t('remove')}
                        icon={<Trash2 className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handleRemoveVideoFromQueue(video)}
                        variant={'destructive'}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {(room?.videoQueue?.length || 0) > 0 && (
                <div className="flex items-center justify-center p-2 bg-background shadow-sm">
                    <div className="flex items-center space-x-2">
                        {(room?.videoQueue?.length || 0) > 2 && (
                            <TooltipButton
                                tooltipContent={t('shuffle')}
                                buttonText={t('shuffle')}
                                icon={<Shuffle className="h-4 w-4 mr-2" />}
                                onConfirm={handleShuffleQueue}
                            />
                        )}

                        <TooltipButton
                            tooltipContent={t('clearQueue')}
                            buttonText={t('clearQueue')}
                            icon={<Trash2 className="h-4 w-4 mr-2" />}
                            onConfirm={handleClearQueue}
                            confirmMode
                            confirmContent={t('clearQueueConfirm')}
                            variant={'destructive'}
                        />
                    </div>
                </div>
            )}
            <VideoList
                keyPrefix={'queue-list'}
                videos={room?.videoQueue || []}
                emptyMessage={t('noVideos')}
                renderButtons={renderButtons}
                onVideoClick={(video) => setSelectedVideo(video.id)}
                selectedVideoId={selectedVideo}
            />
        </div>
    );
}
