'use client';

import React, { useState } from 'react';
import { Play, ListVideo, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoList } from '@/components/VideoList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 px-2.5 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayVideoNow(video);
                                    }}
                                >
                                    <Play className="h-3.5 w-3.5 mr-1" />
                                    <span>{t('playNow')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('playNow')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddVideoToQueue(video);
                                    }}
                                >
                                    <ListVideo className="h-3.5 w-3.5 mr-1" />
                                    <span>{t('addToQueue')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('addToQueue')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            {(room?.historyQueue?.length || 0) > 0 && (
                <div className="flex items-center justify-center p-2 bg-background shadow-sm">
                    <div className="flex items-center space-x-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 px-2 transition-all hover:scale-105"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearHistory();
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        <span>{t('clearHistory')}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{t('clearHistory')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            )}
            <VideoList
                videos={room?.historyQueue || []}
                emptyMessage={t('noHistory')}
                renderButtons={renderButtons}
                onVideoClick={(video) => setSelectedVideo(video.id)}
                selectedVideoId={selectedVideo}
            />
        </div>
    );
}
