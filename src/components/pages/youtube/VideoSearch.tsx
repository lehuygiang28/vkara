'use client';

import React, { useEffect } from 'react';
import { Play, ListVideo, MoveUp } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { AutoComplete } from '@/components/autocomplete';
import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useSearchStore } from '@/store/searchStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeleton } from '@/components/video-skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TooltipButton } from '@/components/tooltip-button';
import { VideoList } from './VideoList';

export function VideoSearch() {
    const t = useScopedI18n('videoSearch');

    const {
        searchQuery,
        isKaraoke,
        isLoading,
        isLoadingSuggestions,
        searchResults,
        suggestions,
        selectedVideoId,
        nextToken,
        isProcessingBatch,
        pendingResults,
        setSearchQuery,
        setIsKaraoke,
        setSelectedVideoId,
        performSearch,
        loadMore,
        processNextBatch,
        fetchSuggestions,
    } = useSearchStore();

    const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
    const { handlePlayVideoNow, handleAddVideoToQueue, handleAddVideoAndMoveToTop } =
        usePlayerAction();

    // Process next batch of videos
    useEffect(() => {
        if (pendingResults.length > 0 && !isProcessingBatch) {
            const timeoutId = setTimeout(processNextBatch, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [pendingResults.length, isProcessingBatch, processNextBatch]);

    // Fetch suggestions when search query changes
    useEffect(() => {
        if (debouncedSearchQuery) {
            fetchSuggestions(debouncedSearchQuery);
        }
    }, [debouncedSearchQuery, fetchSuggestions]);

    // Perform search when karaoke mode changes
    useEffect(() => {
        performSearch(debouncedSearchQuery);
    }, [isKaraoke, debouncedSearchQuery, performSearch]);

    const handleManualSearch = () => {
        if (searchQuery) {
            performSearch(searchQuery);
        }
    };

    function renderButtons(video: YouTubeVideo) {
        return (
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    selectedVideoId === video.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0',
                )}
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <TooltipButton
                        buttonText={t('playNow')}
                        tooltipContent={t('playNow')}
                        icon={<Play className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handlePlayVideoNow(video)}
                        variant={'outline'}
                    />

                    <TooltipButton
                        buttonText={t('addToQueue')}
                        tooltipContent={t('addToQueue')}
                        icon={<ListVideo className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handleAddVideoToQueue(video)}
                    />

                    <TooltipButton
                        buttonText={t('addVideoAndMoveToTop')}
                        tooltipContent={t('addVideoAndMoveToTop')}
                        icon={<MoveUp className="h-3.5 w-3.5 mr-1" />}
                        onConfirm={() => handleAddVideoAndMoveToTop(video)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 pb-3 pt-1 border-b">
                <div className="flex flex-row items-center gap-2">
                    <div className="relative flex-grow">
                        <AutoComplete
                            selectedValue={searchQuery}
                            onSelectedValueChange={(value) => {
                                setSearchQuery(value);
                                handleManualSearch();
                            }}
                            searchValue={searchQuery}
                            onSearchValueChange={setSearchQuery}
                            items={suggestions.map((suggestion: string) => ({
                                value: suggestion,
                                label: suggestion,
                            }))}
                            isLoading={isLoadingSuggestions}
                            placeholder={t('searchPlaceholder')}
                            classNames="flex-grow"
                            showCheck={false}
                            onSearch={handleManualSearch}
                        />
                    </div>
                    <Select
                        value={isKaraoke ? 'karaoke' : 'all'}
                        onValueChange={(value) => {
                            setIsKaraoke(value === 'karaoke');
                        }}
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
            {isLoading && (searchResults?.length || 0) <= 0 ? (
                <div className="space-y-4 p-4">
                    {[...Array(4)].map((_, i) => (
                        <VideoSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <>
                    <VideoList
                        keyPrefix={'search-list'}
                        videos={searchResults}
                        emptyMessage={searchQuery && !pendingResults.length ? t('noResults') : ''}
                        renderButtons={renderButtons}
                        onVideoClick={(video) =>
                            setSelectedVideoId(video.id === selectedVideoId ? null : video.id)
                        }
                        selectedVideoId={selectedVideoId}
                        onLoadMore={loadMore}
                        hasMore={!!nextToken && !isProcessingBatch}
                    />
                </>
            )}
        </div>
    );
}
