'use client';

import { memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { ArrowUpLeft, ChevronLeft, Clock, Loader2, Mic, Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { VoiceSearchOverlay } from '@/components/search/voice-search-overlay';
import { useVoiceSearch } from '@/hooks/use-voice-search';
import type { SpeechRecognitionErrorCode } from '@/hooks/use-speech-recognition';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';

const SUGGESTION_DEBOUNCE_MS = 320;

function focusSearchInput(input: HTMLInputElement | null) {
    if (!input) return;
    input.focus({ preventScroll: true });
    if (input.value.length === 0) return;
    try {
        const length = input.value.length;
        input.setSelectionRange(length, length);
    } catch {
        // Some browsers reject selection until the input is focused.
    }
}

export type SearchPageOverlayProps = {
    open: boolean;
    initialQuery?: string;
    committedQuery: string;
    suggestions: readonly string[];
    isSearching: boolean;
    isLoadingSuggestions: boolean;
    localSuggestionQueries?: readonly string[];
    onCloseAction: () => void;
    onDebouncedQueryAction: (query: string) => void;
    onClearSuggestionsAction: () => void;
    onRemoveLocalSuggestionAction?: (query: string) => void;
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
    suggestions,
    isSearching,
    isLoadingSuggestions,
    localSuggestionQueries = [],
    onCloseAction,
    onDebouncedQueryAction: onDebouncedQuery,
    onClearSuggestionsAction: onClearSuggestions,
    onRemoveLocalSuggestionAction: onRemoveLocalSuggestion,
    onSearchAction: onSearch,
}: SearchPageOverlayContentProps) {
    const t = useScopedI18n('videoSearch');
    const locale = useCurrentLocale();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const openingQuery = (initialQuery !== undefined ? initialQuery : committedQuery).trim();
    const [draft, setDraft] = useState(openingQuery);
    const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
    const [overlayTranscript, setOverlayTranscript] = useState('');
    const useWhisperEngineRef = useRef(false);

    const debouncedNotify = useDebouncedCallback((value: string) => {
        onDebouncedQuery(value);
    }, SUGGESTION_DEBOUNCE_MS);

    useLayoutEffect(() => {
        focusSearchInput(inputRef.current);

        // iOS may ignore synchronous focus; retry once on the next frame only if needed.
        const frame = window.requestAnimationFrame(() => {
            if (document.activeElement !== inputRef.current) {
                focusSearchInput(inputRef.current);
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        onDebouncedQuery(openingQuery);
    }, [onDebouncedQuery, openingQuery]);

    useEffect(() => {
        return () => debouncedNotify.cancel();
    }, [debouncedNotify]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const runSearch = useCallback(
        (value: string) => {
            const trimmed = value.trim();
            debouncedNotify.cancel();
            setDraft(trimmed);
            onSearch(trimmed);
        },
        [debouncedNotify, onSearch],
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
        focusSearchInput(inputRef.current);
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
            focusSearchInput(inputRef.current);
        },
        [debouncedNotify, onDebouncedQuery],
    );

    const handleRemoveLocalSuggestion = useCallback(
        (value: string) => {
            onRemoveLocalSuggestion?.(value);
            debouncedNotify.cancel();
            onDebouncedQuery(draft.trim());
            focusSearchInput(inputRef.current);
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

            toast({ title: description, variant: 'error' });
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

    if (typeof document === 'undefined') {
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
                className="fixed inset-0 z-[190] flex flex-col bg-background text-foreground"
                role="dialog"
                aria-modal="true"
                aria-label={t('search')}
            >
                <header className="flex shrink-0 items-center gap-1 px-safe-offset pt-safe-offset sm:gap-2">
                    <button
                        type="button"
                        onClick={onCloseAction}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('back')}
                    >
                        <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
                    </button>

                    <div className="relative flex min-w-0 flex-1 items-center overflow-hidden rounded-full border border-border/50 bg-muted/40 pl-4 pr-1 shadow-none focus-within:border-ring/60 focus-within:bg-muted/25 focus-within:ring-1 focus-within:ring-ring/40">
                        <input
                            ref={inputRef}
                            type="text"
                            role="combobox"
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            placeholder={t('searchPlaceholder')}
                            value={draft}
                            className="search-overlay-input min-h-11 min-w-0 flex-1 border-0 bg-transparent py-2.5 text-base outline-none placeholder:text-muted-foreground"
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
                        {draft ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 rounded-full"
                                onClick={handleClear}
                                aria-label={t('clearSearch')}
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        ) : null}
                    </div>

                    {isVoiceSupported ? (
                        <button
                            type="button"
                            onClick={startVoiceSession}
                            disabled={isSearching}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                            aria-label={t('voiceSearch')}
                        >
                            <Mic className="h-6 w-6" strokeWidth={1.75} />
                        </button>
                    ) : (
                        <div className="w-3 shrink-0 sm:w-1" aria-hidden />
                    )}
                </header>

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
        document.body,
    );
}

export function SearchPageOverlay({ open, ...props }: SearchPageOverlayProps) {
    if (!open) {
        return null;
    }

    return <SearchPageOverlayContent {...props} />;
}
