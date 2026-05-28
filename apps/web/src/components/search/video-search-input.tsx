'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

const SUGGESTION_DEBOUNCE_MS = 320;
const MIN_SUGGESTION_CHARS = 2;

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

    const trimmedDraft = draft.trim();
    const canSuggest = trimmedDraft.length >= MIN_SUGGESTION_CHARS;
    const showPanel = open && canSuggest && (isLoadingSuggestions || suggestions.length > 0);

    return (
        <Popover open={showPanel} onOpenChange={setOpen}>
            <div className={cn('relative h-11 w-full shrink-0', className)}>
                <PopoverAnchor asChild>
                    <Input
                        ref={inputRef}
                        type="text"
                        inputMode="search"
                        enterKeyHint="search"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={placeholder}
                        value={draft}
                        className="h-11 border-border/80 bg-muted/30 pr-20 text-base shadow-none focus-visible:bg-background"
                        aria-autocomplete="list"
                        aria-controls={showPanel ? listId : undefined}
                        aria-expanded={showPanel}
                        onChange={(e) => handleChange(e.target.value)}
                        onFocus={() => {
                            if (canSuggest && (isLoadingSuggestions || suggestions.length > 0)) {
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
                            }
                        }}
                    />
                </PopoverAnchor>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-0.5">
                    {draft ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="pointer-events-auto h-10 w-10 shrink-0"
                            onClick={handleClear}
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    ) : null}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto h-10 w-10 shrink-0"
                        onClick={() => runSearch(draft)}
                        disabled={isSearching}
                        aria-label="Search"
                    >
                        {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                </div>
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
