'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { BrowseSearchHeader, ResultsSearchHeader } from '@/components/search/search-header';
import { SearchPageOverlay } from '@/components/search/search-page-overlay';
import { VoiceSearchOverlay } from '@/components/search/voice-search-overlay';
import { useScopedI18n, useCurrentLocale } from '@/locales/client';
import { useSearchStore } from '@/store/searchStore';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { useVoiceSearchSession } from '@/hooks/use-voice-search-session';

import { VideoSkeletonListForViewport } from '@/components/video-skeleton';
import { VideoList } from './VideoList';
import { BrowseSuggestionsList } from './BrowseSuggestionsList';
import { RemotePageGutter, RemoteScrollRoot } from './remote-chrome';
import { VideoListEmptyState } from './video-list-empty-state';
import { useVideoSearchListActions } from './use-video-search-list-actions';

export function VideoSearch() {
    const t = useScopedI18n('videoSearch');
    const locale = useCurrentLocale();

    const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
    const [overlayInitialQuery, setOverlayInitialQuery] = useState<string | undefined>(undefined);
    const skeletonScrollRef = useRef<HTMLDivElement>(null);

    const {
        searchQuery,
        isKaraoke,
        isLoading,
        isLoadingMore,
        isLoadingSuggestions,
        searchResults,
        suggestions,
        nextToken,
        error,
        loadMoreFailed,
        searchOverlayRequestId,
        setIsKaraoke,
        performSearch,
        loadMore,
        retryLoadMore,
        refreshSearch,
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
            error: state.error,
            loadMoreFailed: state.loadMoreFailed,
            searchOverlayRequestId: state.searchOverlayRequestId,
            setIsKaraoke: state.setIsKaraoke,
            performSearch: state.performSearch,
            loadMore: state.loadMore,
            retryLoadMore: state.retryLoadMore,
            refreshSearch: state.refreshSearch,
            fetchSuggestions: state.fetchSuggestions,
            clearSuggestions: state.clearSuggestions,
        })),
    );

    const removeSearchHistory = usePersonalizationStore((state) => state.removeSearchHistory);
    const localSuggestionQueries = usePersonalizationStore(
        useShallow((state) => state.searchHistory.map((entry) => entry.query)),
    );
    const renderActions = useVideoSearchListActions();

    const handleSearch = useCallback(
        (query: string) => {
            setSearchOverlayOpen(false);
            void performSearch(query);
        },
        [performSearch],
    );

    const voiceSession = useVoiceSearchSession({
        locale,
        onSearchAction: handleSearch,
        onClearSuggestionsAction: clearSuggestions,
        suspendWhen: isLoading,
    });

    const handleDebouncedQuery = useCallback(
        (query: string) => {
            void fetchSuggestions(query);
        },
        [fetchSuggestions],
    );

    const handleRemoveLocalSuggestion = useCallback(
        (query: string) => {
            removeSearchHistory(query);
        },
        [removeSearchHistory],
    );

    const showBrowseIdle =
        !searchQuery && !isLoading && searchResults.length === 0 && !isLoadingMore;
    const showResults = Boolean(searchQuery) || searchResults.length > 0 || isLoading;

    const handleBackFromResults = useCallback(() => {
        void performSearch('');
        clearSuggestions();
    }, [performSearch, clearSuggestions]);

    const openSearchOverlay = useCallback((initialQuery?: string) => {
        setOverlayInitialQuery(initialQuery);
        setSearchOverlayOpen(true);
    }, []);

    useEffect(() => {
        if (searchOverlayRequestId > 0) {
            openSearchOverlay();
        }
    }, [searchOverlayRequestId, openSearchOverlay]);

    const handleClearResultsQuery = useCallback(() => {
        openSearchOverlay('');
    }, [openSearchOverlay]);

    const handleLoadMore = useCallback(() => {
        if (loadMoreFailed) {
            void retryLoadMore();
            return;
        }
        void loadMore();
    }, [loadMoreFailed, loadMore, retryLoadMore]);

    const showNoResults = Boolean(searchQuery) && searchResults.length === 0 && !isLoading;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <VoiceSearchOverlay
                open={voiceSession.voiceOverlayOpen}
                isRecording={voiceSession.isRecording}
                isProcessing={voiceSession.isProcessing}
                liveTranscript={voiceSession.overlayTranscript}
                useWhisperEngine={voiceSession.useWhisperEngine}
                onCloseAction={voiceSession.closeVoiceOverlay}
                onMicPressAction={voiceSession.handleVoiceMicPress}
            />

            <SearchPageOverlay
                open={searchOverlayOpen}
                initialQuery={overlayInitialQuery}
                committedQuery={searchQuery}
                isKaraoke={isKaraoke}
                suggestions={suggestions}
                isSearching={isLoading}
                isLoadingSuggestions={isLoadingSuggestions}
                localSuggestionQueries={localSuggestionQueries}
                onCloseAction={() => setSearchOverlayOpen(false)}
                onDebouncedQueryAction={handleDebouncedQuery}
                onClearSuggestionsAction={clearSuggestions}
                onRemoveLocalSuggestionAction={handleRemoveLocalSuggestion}
                onKaraokeChangeAction={setIsKaraoke}
                onSearchAction={handleSearch}
                voiceSession={voiceSession}
            />

            <div className="sticky top-0 z-10 shrink-0 border-b bg-background">
                {showResults ? (
                    <ResultsSearchHeader
                        query={searchQuery}
                        isKaraoke={isKaraoke}
                        isVoiceSupported={voiceSession.isVoiceSupported}
                        onBackAction={handleBackFromResults}
                        onOpenSearchAction={() => openSearchOverlay()}
                        onOpenVoiceAction={voiceSession.startVoiceSession}
                        onClearQueryAction={handleClearResultsQuery}
                        onKaraokeChangeAction={setIsKaraoke}
                    />
                ) : (
                    <BrowseSearchHeader
                        isKaraoke={isKaraoke}
                        isVoiceSupported={voiceSession.isVoiceSupported}
                        onOpenSearchAction={() => openSearchOverlay()}
                        onOpenVoiceAction={voiceSession.startVoiceSession}
                        onKaraokeChangeAction={setIsKaraoke}
                    />
                )}
            </div>

            {isLoading && searchResults.length === 0 && !showBrowseIdle ? (
                <RemoteScrollRoot ref={skeletonScrollRef} className="min-h-0 flex-1">
                    <RemotePageGutter>
                        <VideoSkeletonListForViewport
                            scrollRef={skeletonScrollRef}
                            className="pt-2"
                        />
                    </RemotePageGutter>
                </RemoteScrollRoot>
            ) : showBrowseIdle ? (
                <BrowseSuggestionsList className="min-h-0 flex-1" />
            ) : (
                <VideoList
                    videos={searchResults}
                    emptyState={
                        showNoResults ? (
                            <VideoListEmptyState
                                icon={<Search className="h-7 w-7 text-muted-foreground" />}
                                title={error ? t('loadMoreFailed') : t('noResults')}
                                description={error ? t('noResultsErrorHint') : t('noResultsHint')}
                                actions={[
                                    {
                                        label: t('noResultsCta'),
                                        icon: <Search />,
                                        onClick: () => openSearchOverlay(searchQuery),
                                    },
                                ]}
                            />
                        ) : undefined
                    }
                    renderActions={renderActions}
                    onLoadMore={handleLoadMore}
                    hasMore={Boolean(nextToken) || loadMoreFailed}
                    isLoading={isLoadingMore}
                    loadError={loadMoreFailed ? t('loadMoreFailed') : null}
                    onRefresh={() => void refreshSearch()}
                />
            )}
        </div>
    );
}
