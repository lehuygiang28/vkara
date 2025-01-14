'use client';

import React, { useState } from 'react';
import { Search, Mic, Loader2, Play, ListVideo } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoList } from '@/components/VideoList';
import { VideoSkeleton } from '@/components/video-skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function VideoSearch() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const {
        isKaraoke,
        setIsKaraoke,
        searchQuery,
        setSearchQuery,
        isLoading,
        searchResults,
        error,
    } = useYouTubeStore();

    const t = useScopedI18n('videoSearch');
    const { handlePlayVideoNow, handleAddVideoToQueue } = usePlayerAction();

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
                                    <span className="hidden sm:inline">{t('playNow')}</span>
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
                                    <span className="hidden sm:inline">{t('addToQueue')}</span>
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
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-b space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <Input
                            type="search"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-10"
                        />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="absolute right-0 top-0 h-full px-3"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={isKaraoke}
                            onCheckedChange={setIsKaraoke}
                            id="karaoke-mode"
                        />
                        <label htmlFor="karaoke-mode" className="text-sm font-medium">
                            {t('karaokeMode')}
                        </label>
                        <Mic
                            className={cn(
                                'h-4 w-4 transition-opacity',
                                isKaraoke ? 'opacity-100' : 'opacity-50',
                            )}
                        />
                    </div>
                </div>
            </div>
            {isLoading && searchResults.length === 0 ? (
                <div className="space-y-4 p-4">
                    {[...Array(10)].map((_, i) => (
                        <VideoSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {error}
                </div>
            ) : (
                <VideoList
                    videos={searchResults}
                    emptyMessage={searchQuery ? t('noResults') : ''}
                    renderButtons={renderButtons}
                    onVideoClick={(video) =>
                        setSelectedVideo(video.id === selectedVideo ? null : video.id)
                    }
                    selectedVideoId={selectedVideo}
                />
            )}
        </div>
    );
}
