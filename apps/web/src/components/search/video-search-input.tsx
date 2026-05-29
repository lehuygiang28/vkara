'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Mic, Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import {
    localeToSpeechRecognitionLang,
    useSpeechRecognition,
    type SpeechRecognitionErrorCode,
} from '@/hooks/use-speech-recognition';
import { useCurrentLocale, useScopedI18n } from '@/locales/client';

const SUGGESTION_DEBOUNCE_MS = 320;
const MIN_SUGGESTION_CHARS = 2;

const searchFieldClassName =
    'flex h-11 w-full min-w-0 items-center overflow-hidden rounded-md border border-border/80 bg-muted/30 shadow-none transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-1 focus-within:ring-ring';

const searchInputClassName =
    'min-h-11 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50';

export interface VideoSearchInputProps {
    committedQuery: string;
    suggestions: readonly string[];
    isSearching: boolean;
    isLoadingSuggestions: boolean;
    placeholder: string;
    loadingSuggestionsLabel: string;
    className?: string;
    onDebouncedQuery: (query: string) => void;
    onClearSuggestions: () => void;
    onSearch: (query: string) => void;
}

function SuggestionList({
    listId,
    suggestions,
    isLoading,
    loadingLabel,
    onPick,
}: {
    listId: string;
    suggestions: readonly string[];
    isLoading: boolean;
    loadingLabel: string;
    onPick: (value: string) => void;
}) {
    if (isLoading) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
                role="status"
            >
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                {loadingLabel}
            </div>
        );
    }

    return (
        <ul id={listId} role="listbox" className="max-h-[min(40dvh,280px)] overflow-y-auto py-1">
            {suggestions.map((suggestion) => (
                <li key={suggestion}>
                    <button
                        type="button"
                        className="flex w-full px-3 py-2.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(suggestion)}
                    >
                        {suggestion}
                    </button>
                </li>
            ))}
        </ul>
    );
}

const MemoSuggestionList = memo(SuggestionList);

function SearchFieldActions({
    draft,
    isSearching,
    isSpeechSupported,
    isListening,
    onClear,
    onToggleListening,
    onSearch,
    clearLabel,
    voiceLabel,
    voiceStopLabel,
    searchLabel,
}: {
    draft: string;
    isSearching: boolean;
    isSpeechSupported: boolean;
    isListening: boolean;
    onClear: () => void;
    onToggleListening: () => void;
    onSearch: () => void;
    clearLabel: string;
    voiceLabel: string;
    voiceStopLabel: string;
    searchLabel: string;
}) {
    return (
        <div
            className="flex shrink-0 items-center gap-px border-l border-border/60 pl-0.5 pr-1"
            role="group"
            aria-label={searchLabel}
        >
            {draft ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={onClear}
                    aria-label={clearLabel}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </Button>
            ) : null}
            {isSpeechSupported ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'h-9 w-9 shrink-0',
                        isListening && 'bg-primary/15 text-primary hover:bg-primary/20',
                    )}
                    onClick={onToggleListening}
                    disabled={isSearching}
                    aria-label={isListening ? voiceStopLabel : voiceLabel}
                    aria-pressed={isListening}
                >
                    <Mic
                        className={cn(
                            'h-4 w-4',
                            isListening ? 'animate-pulse text-primary' : 'text-muted-foreground',
                        )}
                    />
                </Button>
            ) : null}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onSearch}
                disabled={isSearching}
                aria-label={searchLabel}
            >
                {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Search className="h-4 w-4 text-muted-foreground" />
                )}
            </Button>
        </div>
    );
}

const MemoSearchFieldActions = memo(SearchFieldActions);

export const VideoSearchInput = memo(function VideoSearchInput({
    committedQuery,
    suggestions,
    isSearching,
    isLoadingSuggestions,
    placeholder,
    loadingSuggestionsLabel,
    className,
    onDebouncedQuery,
    onClearSuggestions,
    onSearch,
}: VideoSearchInputProps) {
    const t = useScopedI18n('videoSearch');
    const locale = useCurrentLocale();
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState(committedQuery);
    const [open, setOpen] = useState(false);

    const debouncedNotify = useDebouncedCallback((value: string) => {
        onDebouncedQuery(value);
    }, SUGGESTION_DEBOUNCE_MS);

    useEffect(() => {
        setDraft(committedQuery);
    }, [committedQuery]);

    useEffect(() => {
        if (isSearching) {
            setOpen(false);
        }
    }, [isSearching]);

    useEffect(() => {
        if (!isLoadingSuggestions && suggestions.length === 0) {
            setOpen(false);
        }
    }, [isLoadingSuggestions, suggestions.length]);

    useEffect(() => {
        return () => debouncedNotify.cancel();
    }, [debouncedNotify]);

    const runSearch = useCallback(
        (value: string) => {
            const trimmed = value.trim();
            debouncedNotify.cancel();
            setDraft(trimmed);
            setOpen(false);
            onSearch(trimmed);
        },
        [debouncedNotify, onSearch],
    );

    const handleChange = useCallback(
        (value: string) => {
            setDraft(value);
            const trimmed = value.trim();
            if (trimmed.length < MIN_SUGGESTION_CHARS) {
                debouncedNotify.cancel();
                onClearSuggestions();
                setOpen(false);
                return;
            }
            setOpen(true);
            debouncedNotify(value);
        },
        [debouncedNotify, onClearSuggestions],
    );

    const handleClear = useCallback(() => {
        debouncedNotify.cancel();
        setDraft('');
        setOpen(false);
        onClearSuggestions();
        inputRef.current?.focus();
    }, [debouncedNotify, onClearSuggestions]);

    const handlePickSuggestion = useCallback(
        (value: string) => {
            runSearch(value);
        },
        [runSearch],
    );

    const handleSpeechError = useCallback(
        (error: SpeechRecognitionErrorCode) => {
            let description = t('voiceError');
            if (error === 'not-allowed' || error === 'service-not-allowed') {
                description = t('voicePermissionDenied');
            } else if (error === 'no-speech') {
                description = t('voiceNoSpeech');
            }

            toast({ title: description, variant: 'error' });
        },
        [t],
    );

    const handleSpeechTranscript = useCallback(
        (transcript: string, isFinal: boolean) => {
            handleChange(transcript);
            if (isFinal) {
                runSearch(transcript);
            }
        },
        [handleChange, runSearch],
    );

    const { isSupported: isSpeechSupported, isListening, toggleListening, stopListening } =
        useSpeechRecognition({
            lang: localeToSpeechRecognitionLang(locale),
            onTranscript: handleSpeechTranscript,
            onError: handleSpeechError,
        });

    useEffect(() => {
        if (isSearching) {
            stopListening();
        }
    }, [isSearching, stopListening]);

    const trimmedDraft = draft.trim();
    const canSuggest = trimmedDraft.length >= MIN_SUGGESTION_CHARS;
    const showPanel = open && canSuggest && (isLoadingSuggestions || suggestions.length > 0);

    return (
        <Popover open={showPanel} onOpenChange={setOpen}>
            <div className={cn('w-full min-w-0', className)}>
                <PopoverAnchor asChild>
                    <div
                        className={cn(
                            searchFieldClassName,
                            isListening && 'border-primary/50 ring-1 ring-primary/30',
                        )}
                    >
                        <input
                            ref={inputRef}
                            type="search"
                            inputMode="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder={isListening ? t('voiceListening') : placeholder}
                            value={draft}
                            className={searchInputClassName}
                            aria-autocomplete="list"
                            aria-controls={showPanel ? listId : undefined}
                            aria-expanded={showPanel}
                            onChange={(e) => handleChange(e.target.value)}
                            onFocus={() => {
                                if (
                                    canSuggest &&
                                    (isLoadingSuggestions || suggestions.length > 0)
                                ) {
                                    setOpen(true);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    runSearch(draft);
                                }
                                if (e.key === 'Escape') {
                                    setOpen(false);
                                    if (isListening) {
                                        stopListening();
                                    }
                                }
                            }}
                        />
                        <MemoSearchFieldActions
                            draft={draft}
                            isSearching={isSearching}
                            isSpeechSupported={isSpeechSupported}
                            isListening={isListening}
                            onClear={handleClear}
                            onToggleListening={toggleListening}
                            onSearch={() => runSearch(draft)}
                            clearLabel={t('clearSearch')}
                            voiceLabel={t('voiceSearch')}
                            voiceStopLabel={t('voiceStop')}
                            searchLabel={t('search')}
                        />
                    </div>
                </PopoverAnchor>
            </div>
            {showPanel ? (
                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    sideOffset={6}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <MemoSuggestionList
                        listId={listId}
                        suggestions={suggestions}
                        isLoading={isLoadingSuggestions}
                        loadingLabel={loadingSuggestionsLabel}
                        onPick={handlePickSuggestion}
                    />
                </PopoverContent>
            ) : null}
        </Popover>
    );
});
