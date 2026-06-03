'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { ArrowUpLeft, Clock, Loader2, Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { toast } from '@/hooks/use-toast';
import {
    SearchFieldChrome,
    SearchFieldClearButton,
    SearchFieldModeActions,
    SearchHeaderBackButton,
    SearchHeaderRow,
} from '@/components/search/search-header';
import { VoiceSearchOverlay } from '@/components/search/voice-search-overlay';
import { useOverlayPortal } from '@/components/pages/youtube/remote-panel-overlay-root';
import { useVoiceSearch } from '@/hooks/use-voice-search';
import type { SpeechRecognitionErrorCode } from '@/hooks/use-speech-recognition';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';

const SUGGESTION_DEBOUNCE_MS = 320;

export type SearchPageOverlayProps = {
    open: boolean;
    initialQuery?: string;
    committedQuery: string;
    isKaraoke: boolean;
    suggestions: readonly string[];
    isSearching: boolean;
    isLoadingSuggestions: boolean;
    localSuggestionQueries?: readonly string[];
    onCloseAction: () => void;
    onDebouncedQueryAction: (query: string) => void;
    onClearSuggestionsAction: () => void;
    onRemoveLocalSuggestionAction?: (query: string) => void;
    onKaraokeChangeAction: (isKaraoke: boolean, queryOverride?: string) => void;
    onSearchAction: (query: string) => void;
};

function SuggestionRow({
    suggestion,
    isHistoryItem,
    deleteLabel,
    refillLabel,
    removable,
    onPick,
    onRefill,
    onRemove,
}: {
    suggestion: string;
    isHistoryItem: boolean;
    deleteLabel: string;
    refillLabel: string;
    removable: boolean;
    onPick: () => void;
    onRefill: () => void;
    onRemove?: () => void;
}) {
    return (
        <div className="flex w-full items-center">
            <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left text-[0.9375rem] leading-snug hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none active:bg-accent/80"
                onClick={onPick}
            >
                {isHistoryItem ? (
                    <Clock
                        className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                ) : (
                    <Search
                        className="h-[1.125rem] w-[1.125rem] shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                )}
                <span className="min-w-0 flex-1 truncate">{suggestion}</span>
            </button>
            {removable ? (
                <button
                    type="button"
                    className="flex h-11 w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                    aria-label={deleteLabel}
                    onClick={onRemove}
                >
                    <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </button>
            ) : null}
            <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                aria-label={refillLabel}
                onClick={onRefill}
            >
                <ArrowUpLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </button>
        </div>
    );
}

const MemoSuggestionRow = memo(SuggestionRow);

function SuggestionPanel({
    listId,
    suggestions,
    isLoading,
    loadingLabel,
    localSuggestionQueries,
    deleteLabel,
    refillLabel,
    onPick,
    onRefill,
    onRemoveLocalSuggestion,
}: {
    listId: string;
    suggestions: readonly string[];
    isLoading: boolean;
    loadingLabel: string;
    localSuggestionQueries: readonly string[];
    deleteLabel: string;
    refillLabel: string;
    onPick: (value: string) => void;
    onRefill: (value: string) => void;
    onRemoveLocalSuggestion?: (value: string) => void;
}) {
    const isLocalSuggestion = (suggestion: string) =>
        localSuggestionQueries.some(
            (query) => query.trim().toLowerCase() === suggestion.trim().toLowerCase(),
        );

    if (isLoading && suggestions.length === 0) {
        return (
            <div
                className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground"
                role="status"
            >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                {loadingLabel}
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <ul id={listId} role="listbox" className="divide-y divide-border/40">
            {suggestions.map((suggestion) => {
                const removable = Boolean(onRemoveLocalSuggestion) && isLocalSuggestion(suggestion);

                return (
                    <li key={suggestion}>
                        <MemoSuggestionRow
                            suggestion={suggestion}
                            isHistoryItem={isLocalSuggestion(suggestion)}
                            deleteLabel={deleteLabel}
                            refillLabel={refillLabel}
                            removable={removable}
                            onPick={() => onPick(suggestion)}
                            onRefill={() => onRefill(suggestion)}
                            onRemove={
                                onRemoveLocalSuggestion
                                    ? () => onRemoveLocalSuggestion(suggestion)
                                    : undefined
                            }
                        />
                    </li>
                );
            })}
        </ul>
    );
}

const MemoSuggestionPanel = memo(SuggestionPanel);

type SearchPageOverlayContentProps = Omit<SearchPageOverlayProps, 'open'>;

/** Mounted only while the search overlay is open — keeps voice hooks and DOM idle when closed. */
function SearchPageOverlayContent({
    initialQuery,
    committedQuery,
    isKaraoke,
    suggestions,
    isSearching,
    isLoadingSuggestions,
    localSuggestionQueries = [],
    onCloseAction,
    onDebouncedQueryAction: onDebouncedQuery,
    onClearSuggestionsAction: onClearSuggestions,
    onRemoveLocalSuggestionAction: onRemoveLocalSuggestion,
    onKaraokeChangeAction: onKaraokeChange,
    onSearchAction: onSearch,
}: SearchPageOverlayContentProps) {
    const t = useScopedI18n('videoSearch');
    const locale = useCurrentLocale();
    const listId = useId();
    const openingQuery = (initialQuery !== undefined ? initialQuery : committedQuery).trim();
    const [draft, setDraft] = useState(openingQuery);
    const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
    const [overlayTranscript, setOverlayTranscript] = useState('');
    const useWhisperEngineRef = useRef(false);

    const debouncedNotify = useDebouncedCallback((value: string) => {
        onDebouncedQuery(value);
    }, SUGGESTION_DEBOUNCE_MS);

    useEffect(() => {
        onDebouncedQuery(openingQuery);
    }, [onDebouncedQuery, openingQuery]);

    useEffect(() => {
        return () => debouncedNotify.cancel();
    }, [debouncedNotify]);

    const { portalTarget, positionClass } = useOverlayPortal(true);

    const runSearch = useCallback(
        (value: string) => {
            const trimmed = value.trim();
            debouncedNotify.cancel();
            setDraft(trimmed);
            onSearch(trimmed);
        },
        [debouncedNotify, onSearch],
    );

    const handleKaraokeChange = useCallback(
        (value: boolean) => {
            const activeQuery = draft.trim() || committedQuery.trim();
            onKaraokeChange(value, activeQuery || undefined);
            if (draft.trim()) {
                debouncedNotify.cancel();
                onCloseAction();
            }
        },
        [committedQuery, draft, debouncedNotify, onCloseAction, onKaraokeChange],
    );

    const handleChange = useCallback(
        (value: string) => {
            setDraft(value);
            debouncedNotify(value);
        },
        [debouncedNotify],
    );

    const handleClear = useCallback(() => {
        debouncedNotify.cancel();
        setDraft('');
        onDebouncedQuery('');
    }, [debouncedNotify, onDebouncedQuery]);

    const handlePickSuggestion = useCallback(
        (value: string) => {
            runSearch(value);
        },
        [runSearch],
    );

    const handleRefillSuggestion = useCallback(
        (value: string) => {
            debouncedNotify.cancel();
            setDraft(value);
            onDebouncedQuery(value);
        },
        [debouncedNotify, onDebouncedQuery],
    );

    const handleRemoveLocalSuggestion = useCallback(
        (value: string) => {
            onRemoveLocalSuggestion?.(value);
            debouncedNotify.cancel();
            onDebouncedQuery(draft.trim());
        },
        [debouncedNotify, draft, onDebouncedQuery, onRemoveLocalSuggestion],
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

            toast({ id: 'voice-search-error', title: description, variant: 'error' });
        },
        [t],
    );

    const handleSpeechTranscript = useCallback(
        (transcript: string, isFinal: boolean) => {
            const trimmed = transcript.trim();
            setOverlayTranscript(transcript);

            const finishWithSearch = () => {
                debouncedNotify.cancel();
                onClearSuggestions();
                setVoiceOverlayOpen(false);
                setOverlayTranscript('');
                runSearch(trimmed);
            };

            if (useWhisperEngineRef.current) {
                if (!trimmed) return;
                debouncedNotify.cancel();
                onClearSuggestions();
                window.setTimeout(() => {
                    setVoiceOverlayOpen(false);
                    setOverlayTranscript('');
                    runSearch(trimmed);
                }, 450);
                return;
            }

            if (isFinal && trimmed) {
                finishWithSearch();
            }
        },
        [debouncedNotify, onClearSuggestions, runSearch],
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
        if (isSearching) {
            setVoiceOverlayOpen(false);
            setOverlayTranscript('');
            stopListening();
        }
    }, [isSearching, stopListening]);

    if (typeof document === 'undefined' || !portalTarget) {
        return null;
    }

    return ReactDOM.createPortal(
        <>
            <VoiceSearchOverlay
                open={voiceOverlayOpen}
                isListening={isListening}
                isProcessing={isProcessing}
                liveTranscript={overlayTranscript}
                useWhisperEngine={useWhisperEngine}
                onCloseAction={closeVoiceOverlay}
                onMicPressAction={handleVoiceMicPress}
            />
            <div
                className={`${positionClass} inset-0 z-[190] flex flex-col bg-background text-foreground`}
                role="dialog"
                aria-modal="true"
                aria-label={t('search')}
            >
                <SearchHeaderRow className="shrink-0 pb-0">
                    <SearchHeaderBackButton onClickAction={onCloseAction} />
                    <SearchFieldChrome variant="overlay">
                        <input
                            type="text"
                            role="combobox"
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            autoFocus
                            placeholder={t('searchPlaceholder')}
                            value={draft}
                            className="search-overlay-input min-w-0 flex-1 border-0 bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
                            aria-autocomplete="list"
                            aria-controls={listId}
                            aria-expanded={suggestions.length > 0}
                            onChange={(event) => handleChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    runSearch(draft);
                                }
                                if (event.key === 'Escape') {
                                    if (voiceOverlayOpen || isListening || isProcessing) {
                                        closeVoiceOverlay();
                                        return;
                                    }
                                    onCloseAction();
                                }
                            }}
                        />
                        {draft ? <SearchFieldClearButton onClickAction={handleClear} /> : null}
                        <SearchFieldModeActions
                            isKaraoke={isKaraoke}
                            onKaraokeChangeAction={handleKaraokeChange}
                            isVoiceSupported={isVoiceSupported}
                            onOpenVoiceAction={startVoiceSession}
                            voiceDisabled={isSearching}
                        />
                    </SearchFieldChrome>
                </SearchHeaderRow>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-safe-offset">
                    <MemoSuggestionPanel
                        listId={listId}
                        suggestions={suggestions}
                        isLoading={isLoadingSuggestions}
                        loadingLabel={t('loadingSuggestions')}
                        localSuggestionQueries={localSuggestionQueries}
                        deleteLabel={t('deleteSearch')}
                        refillLabel={t('refillSearch')}
                        onPick={handlePickSuggestion}
                        onRefill={handleRefillSuggestion}
                        onRemoveLocalSuggestion={
                            onRemoveLocalSuggestion ? handleRemoveLocalSuggestion : undefined
                        }
                    />
                </div>
            </div>
        </>,
        portalTarget,
    );
}

export function SearchPageOverlay({ open, ...props }: SearchPageOverlayProps) {
    if (!open) {
        return null;
    }

    return <SearchPageOverlayContent {...props} />;
}
