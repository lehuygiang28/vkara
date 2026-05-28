'use client';

import { memo, useCallback } from 'react';
import { ListPlus, Play } from 'lucide-react';
import type { YouTubeVideo } from '@/types/youtube.type';
import { useShallow } from 'zustand/react/shallow';

import { VideoSearchInput } from '@/components/search/video-search-input';
import { useScopedI18n } from '@/locales/client';
import { useSearchStore } from '@/store/searchStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { VideoSkeletonList } from '@/components/video-skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { VideoList } from './VideoList';
import { SearchBrowseHint } from './SearchBrowseHint';
import { RelatedVideoList, useHasRelatedFeed } from './RelatedVideoList';
import { VideoListActionBar } from './video-list-action-bar';

const VideoActionButtons = memo(function VideoActionButtons({
    video,
    onPlay,
    onQueue,
    closeMenu,
}: {
    video: YouTubeVideo;
    onPlay: (video: YouTubeVideo) => void;
    onQueue: (video: YouTubeVideo) => void;
    closeMenu: () => void;
}) {
    const t = useScopedI18n('videoSearch');

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
                        closeMenu();
                        onPlay(video);
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
                        onQueue(video);
                    },
                },
            ]}
        />
    );
});

export function VideoSearch() {
    const t = useScopedI18n('videoSearch');

    const {
        searchQuery,
        isKaraoke,
        isLoading,
        isLoadingMore,
        isLoadingSuggestions,
        searchResults,
        suggestions,
        nextToken,
        setIsKaraoke,
        performSearch,
        loadMore,
        fetchSuggestions,
        clearSuggestions,
    } = useSearchStore(
        useShallow((state) => ({
            searchQuery: state.searchQuery,
            isKaraoke: state.isKaraoke,
            isLoading: state.isLoading,
            isLoadingMore: state.isLoadingMore,
            isLoadingSuggestions: state.isLoadingSuggestions,
            searchResults: state.searchResults,
            suggestions: state.suggestions,
            nextToken: state.nextToken,
            setIsKaraoke: state.setIsKaraoke,
            performSearch: state.performSearch,
            loadMore: state.loadMore,
            fetchSuggestions: state.fetchSuggestions,
            clearSuggestions: state.clearSuggestions,
        })),
    );

    const { handlePlayVideoNow, handleAddVideoToQueue } = usePlayerAction();

    const handleSearch = useCallback(
        (query: string) => {
            void performSearch(query);
        },
        [performSearch],
    );

    const handleDebouncedQuery = useCallback(
        (query: string) => {
            void fetchSuggestions(query);
        },
        [fetchSuggestions],
    );

    const handlePlay = useCallback(
        (video: YouTubeVideo) => {
            handlePlayVideoNow(video);
        },
        [handlePlayVideoNow],
    );

    const handleQueue = useCallback(
        (video: YouTubeVideo) => {
            handleAddVideoToQueue(video);
        },
        [handleAddVideoToQueue],
    );

    const renderActions = useCallback(
        (video: YouTubeVideo, { closeMenu }: { closeMenu: () => void }) => (
            <VideoActionButtons
                video={video}
                closeMenu={closeMenu}
                onPlay={handlePlay}
                onQueue={handleQueue}
            />
        ),
        [handlePlay, handleQueue],
    );

    const showBrowseIdle =
        !searchQuery && !isLoading && searchResults.length === 0 && !isLoadingMore;
    const hasRelatedFeed = useHasRelatedFeed();

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="sticky top-0 z-10 border-b bg-background/95 px-safe-offset pb-5 pt-safe-offset backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex items-center gap-2">
                    <VideoSearchInput
                        className="min-w-0 flex-1"
                        committedQuery={searchQuery}
                        suggestions={suggestions}
                        isSearching={isLoading}
                        isLoadingSuggestions={isLoadingSuggestions}
                        placeholder={t('searchPlaceholder')}
                        loadingSuggestionsLabel={t('loadingSuggestions')}
                        onDebouncedQuery={handleDebouncedQuery}
                        onClearSuggestions={clearSuggestions}
                        onSearch={handleSearch}
                    />
                    <Select
                        value={isKaraoke ? 'karaoke' : 'all'}
                        onValueChange={(value) => {
                            setIsKaraoke(value === 'karaoke');
                        }}
                    >
                        <SelectTrigger className="h-11 min-h-11 w-[5.75rem] shrink-0 border-border/80 bg-muted/30 px-2.5 py-0 text-base leading-none shadow-none data-[placeholder]:text-muted-foreground">
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
                <VideoSkeletonList count={6} className="pb-remote-scroll pt-2" />
            ) : showBrowseIdle && hasRelatedFeed ? (
                <RelatedVideoList keyPrefix="search-idle-related" />
            ) : showBrowseIdle ? (
                <SearchBrowseHint />
            ) : (
                <VideoList
                    keyPrefix="search-list"
                    videos={searchResults}
                    emptyMessage={
                        searchQuery && searchResults.length === 0 && !isLoading
                            ? t('noResults')
                            : ''
                    }
                    renderActions={renderActions}
                    onLoadMore={loadMore}
                    hasMore={Boolean(nextToken)}
                    isLoading={isLoading || isLoadingMore}
                />
            )}
        </div>
    );
}
