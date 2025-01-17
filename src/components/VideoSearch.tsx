'use client';

import React, { useEffect, useState } from 'react';
import { Search, Loader2, Play, ListVideo } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { cn } from '@/lib/utils';
import { useI18n, useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { searchYouTube } from '@/actions/youtube';

import { VideoList } from '@/components/VideoList';
import { VideoSkeleton } from '@/components/video-skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function VideoSearch() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const {
        isKaraoke,
        searchQuery,
        setIsKaraoke,
        setSearchQuery,
        isLoading,
        searchResults,
        error,
        setSearchResults,
        setIsLoading,
        setError,
    } = useYouTubeStore();

    const t = useScopedI18n('videoSearch');
    const t_Global = useI18n();
    const { handlePlayVideoNow, handleAddVideoToQueue } = usePlayerAction();
    const [debouncedSearch] = useDebounce(searchQuery, 1000);

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch) {
                setIsLoading(true);
                setError(null);
                try {
                    const results = await searchYouTube(debouncedSearch, isKaraoke);
                    setSearchResults(results?.items || []);
                } catch (err) {
                    setError(t_Global('youtubePage.failedToFetch'));
                    console.error('Search error:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        performSearch();
    }, [debouncedSearch, isKaraoke, setSearchResults, setIsLoading, setError, t_Global]);

    function renderButtons(video: YouTubeVideo) {
        return (
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    selectedVideo === video.id ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
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
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 pb-3 pt-1 border-b">
                <div className="flex flex-row items-center gap-2">
                    <div className="relative flex-grow">
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
                    <Select
                        value={isKaraoke ? 'karaoke' : 'all'}
                        onValueChange={(value) => setIsKaraoke(value === 'karaoke')}
                    >
                        <SelectTrigger className="w-[6rem]">
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <span className="flex items-center">{t('allMode')}</span>
                            </SelectItem>
                            <SelectItem value="karaoke">
                                <span className="flex items-center">{t('karaokeMode')}</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
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
                    keyPrefix={'search-list'}
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
