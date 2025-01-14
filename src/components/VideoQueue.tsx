'use client';

import React, { useState } from 'react';
import { Trash2, MoveUp, Shuffle, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoList } from '@/components/VideoList';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2.5 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveVideoToTop(video);
                                    }}
                                >
                                    <MoveUp className="h-3.5 w-3.5 mr-1" />
                                    <span className="hidden sm:inline">{t('moveToTop')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('moveToTop')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2.5 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveVideoFromQueue(video);
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    <span className="hidden sm:inline">{t('remove')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('remove')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <div className="flex items-center justify-center p-2 bg-background shadow-sm">
                <div className="flex items-center space-x-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleShuffleQueue();
                                    }}
                                >
                                    <Shuffle className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">{t('shuffle')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('shuffle')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 px-2 transition-all hover:scale-105"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearQueue();
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">{t('clearQueue')}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('clearQueue')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <VideoList
                videos={room?.videoQueue || []}
                emptyMessage={t('noVideos')}
                renderButtons={renderButtons}
                onVideoClick={(video) => setSelectedVideo(video.id)}
                selectedVideoId={selectedVideo}
            />
        </div>
    );
}
