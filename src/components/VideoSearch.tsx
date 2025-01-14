/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Search, Mic, Loader2, Play, ListVideo } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { cn, formatViewCount } from '@/lib/utils';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { YouTubeVideo } from '@/types/youtube.type';

import { VideoSkeleton } from '@/components/video-skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function VideoSearch() {
    const {
        room,
        isKaraoke,
        setIsKaraoke,
        searchQuery,
        setSearchQuery,
        isLoading,
        searchResults,
        selectedVideo,
        setSelectedVideo,
        error,
        playNow,
        addVideo,
    } = useYouTubeStore();

    const { sendMessage } = useWebSocketStore();
    const t = useScopedI18n('videoSearch');

    const playNowHandler = (video: YouTubeVideo) => {
        if (room) {
            sendMessage({ type: 'playNow', video });
        } else {
            playNow(video);
        }
    };

    const addVideoHandler = (video: YouTubeVideo) => {
        if (room) {
            sendMessage({ type: 'addVideo', video });
        } else {
            addVideo(video);
        }
    };

    return (
        <>
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
            <ScrollArea className="h-[calc(100vh-30rem)] sm:h-[calc(100vh-20rem)] md:h-[calc(100vh-10rem)] pb-0">
                <div className="divide-y">
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
                    ) : searchResults.length === 0 && searchQuery ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            {t('noResults')}
                        </div>
                    ) : (
                        <div className="divide-y">
                            {searchResults.map((video) => (
                                <div
                                    key={video.id}
                                    onClick={() =>
                                        setSelectedVideo(
                                            selectedVideo === (video?.id ?? null)
                                                ? null
                                                : video?.id ?? null,
                                        )
                                    }
                                    className={cn(
                                        'video-item group flex w-full items-start gap-3 p-4 text-left text-sm transition-all relative',
                                        'hover:bg-accent/50 cursor-pointer',
                                        'sm:items-center',
                                        selectedVideo === video.id && 'bg-accent',
                                    )}
                                >
                                    <div className="relative aspect-video w-24 sm:w-32 flex-shrink-0 overflow-hidden rounded-md">
                                        <div
                                            className={cn(
                                                'absolute inset-0 transition-all duration-200',
                                                selectedVideo === video.id && 'bg-black/20',
                                            )}
                                        />
                                        <img
                                            src={video.thumbnail?.url}
                                            alt={video.title}
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                                            {video.duration_formatted}
                                        </div>
                                    </div>
                                    <div className="flex flex-col flex-grow min-w-0">
                                        <div className="font-medium leading-snug mb-1 line-clamp-2">
                                            {video.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                            {video.channel?.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatViewCount(video.views)} {t('views')}
                                        </div>
                                        <div
                                            className={cn(
                                                'overflow-hidden transition-all duration-300 ease-in-out',
                                                selectedVideo === video.id
                                                    ? 'max-h-20 mt-2 opacity-100'
                                                    : 'max-h-0 opacity-0',
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
                                                                    playNowHandler(video);
                                                                }}
                                                            >
                                                                <Play className="h-3.5 w-3.5 mr-1" />
                                                                <span className="hidden sm:inline">
                                                                    {t('playNow')}
                                                                </span>
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
                                                                    addVideoHandler(video);
                                                                }}
                                                            >
                                                                <ListVideo className="h-3.5 w-3.5 mr-1" />
                                                                <span className="hidden sm:inline">
                                                                    {t('addToQueue')}
                                                                </span>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t('addToQueue')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}
