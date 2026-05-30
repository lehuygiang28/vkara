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
import { useVoiceSearch } from '@/hooks/use-voice-search';
import type { SpeechRecognitionErrorCode } from '@/hooks/use-speech-recognition';
import { toast } from '@/hooks/use-toast';

import { VideoSkeletonList } from '@/components/video-skeleton';
import { VideoList } from './VideoList';
import { BrowseSuggestionsList } from './BrowseSuggestionsList';
import { VideoListEmptyState } from './video-list-empty-state';
import { useVideoSearchListActions } from './use-video-search-list-actions';

export function VideoSearch() {
    const t = useScopedI18n('videoSearch');
    const locale = useCurrentLocale();

    const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
    const [overlayInitialQuery, setOverlayInitialQuery] = useState<string | undefined>(undefined);
    const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
    const [overlayTranscript, setOverlayTranscript] = useState('');
    const useWhisperEngineRef = useRef(false);

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

    const handleSpeechError = useCallback(
        (error: SpeechRecognitionErrorCode | string) => {
            setVoiceOverlayOpen(false);
            setOverlayTranscript('');

            let description = t('voiceError');
            if (error === 'not-allowed' || error === 'service-not-allowed') {
                description = t('voicePermissionDenied');
            } else if (error === 'no-speech') {
                description = t('voiceNoSpeech');
            } else if (error === 'network') {
                description = t('voiceNetworkError');
            }

            toast({ title: description, variant: 'error' });
        },
        [t],
    );

    const handleSpeechTranscript = useCallback(
        (transcript: string, isFinal: boolean) => {
            const trimmed = transcript.trim();
            setOverlayTranscript(transcript);

            const finishWithSearch = () => {
                clearSuggestions();
                setVoiceOverlayOpen(false);
                setOverlayTranscript('');
                setSearchOverlayOpen(false);
                void performSearch(trimmed);
            };

            if (useWhisperEngineRef.current) {
                if (!trimmed) return;
                clearSuggestions();
                window.setTimeout(() => {
                    setVoiceOverlayOpen(false);
                    setOverlayTranscript('');
                    setSearchOverlayOpen(false);
                    void performSearch(trimmed);
                }, 450);
                return;
            }

            if (isFinal && trimmed) {
                finishWithSearch();
            }
        },
        [clearSuggestions, performSearch],
    );

    const {
        isVoiceSupported,
        isListening,
        isProcessing,
        toggleListening,
        stopListening,
        useWhisperEngine,
    } = useVoiceSearch({
        locale,
        onTranscriptAction: handleSpeechTranscript,
        onErrorAction: handleSpeechError,
    });

    useEffect(() => {
        useWhisperEngineRef.current = useWhisperEngine;
    }, [useWhisperEngine]);

    const closeVoiceOverlay = useCallback(() => {
        setVoiceOverlayOpen(false);
        setOverlayTranscript('');
        stopListening();
    }, [stopListening]);

    const startVoiceSession = useCallback(() => {
        setOverlayTranscript('');
        setVoiceOverlayOpen(true);
        if (!isListening && !isProcessing) {
            toggleListening();
        }
    }, [isListening, isProcessing, toggleListening]);

    const handleVoiceMicPress = useCallback(() => {
        if (isProcessing) return;
        if (isListening) {
            stopListening();
            return;
        }
        startVoiceSession();
    }, [isListening, isProcessing, startVoiceSession, stopListening]);

    useEffect(() => {
        if (isLoading && voiceOverlayOpen) {
            setVoiceOverlayOpen(false);
            setOverlayTranscript('');
            stopListening();
        }
    }, [isLoading, voiceOverlayOpen, stopListening]);

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
                open={voiceOverlayOpen && !searchOverlayOpen}
                isListening={isListening}
                isProcessing={isProcessing}
                liveTranscript={overlayTranscript}
                useWhisperEngine={useWhisperEngine}
                onCloseAction={closeVoiceOverlay}
                onMicPressAction={handleVoiceMicPress}
            />

            <SearchPageOverlay
                open={searchOverlayOpen}
                initialQuery={overlayInitialQuery}
                committedQuery={searchQuery}
                suggestions={suggestions}
                isSearching={isLoading}
                isLoadingSuggestions={isLoadingSuggestions}
                localSuggestionQueries={localSuggestionQueries}
                onCloseAction={() => setSearchOverlayOpen(false)}
                onDebouncedQueryAction={handleDebouncedQuery}
                onClearSuggestionsAction={clearSuggestions}
                onRemoveLocalSuggestionAction={handleRemoveLocalSuggestion}
                onSearchAction={handleSearch}
            />

            <div className="sticky top-0 z-10 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                {showResults ? (
                    <ResultsSearchHeader
                        query={searchQuery}
                        isKaraoke={isKaraoke}
                        isVoiceSupported={isVoiceSupported}
                        onBackAction={handleBackFromResults}
                        onOpenSearchAction={() => openSearchOverlay()}
                        onOpenVoiceAction={startVoiceSession}
                        onClearQueryAction={handleClearResultsQuery}
                        onKaraokeChangeAction={setIsKaraoke}
                    />
                ) : (
                    <BrowseSearchHeader
                        isKaraoke={isKaraoke}
                        isVoiceSupported={isVoiceSupported}
                        onOpenSearchAction={() => openSearchOverlay()}
                        onOpenVoiceAction={startVoiceSession}
                        onKaraokeChangeAction={setIsKaraoke}
                    />
                )}
            </div>

            {isLoading && searchResults.length === 0 && !showBrowseIdle ? (
                <VideoSkeletonList count={6} className="pb-remote-scroll" />
            ) : showBrowseIdle ? (
                <BrowseSuggestionsList />
            ) : (
                <VideoList
                    keyPrefix="search-list"
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
                    isLoading={isLoading || isLoadingMore}
                    loadError={loadMoreFailed ? t('loadMoreFailed') : null}
                    onRefresh={() => void refreshSearch()}
                />
            )}
        </div>
    );
}
