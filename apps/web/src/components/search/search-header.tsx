'use client';

import type { ReactNode } from 'react';
import { ArrowLeftRight, ChevronLeft, Mic, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';

type KaraokeModeChipProps = {
    isKaraoke: boolean;
    onChangeAction: (isKaraoke: boolean) => void;
    className?: string;
};

/** Compact mode control — lives inside the search field to save vertical space. */
export function KaraokeModeChip({
    isKaraoke,
    onChangeAction: onChange,
    className,
}: KaraokeModeChipProps) {
    const t = useScopedI18n('videoSearch');
    const label = isKaraoke ? t('karaokeModeShort') : t('allModeShort');
    const switchHint = isKaraoke ? t('switchToAllMode') : t('switchToKaraokeMode');

    return (
        <button
            type="button"
            aria-pressed={isKaraoke}
            aria-label={switchHint}
            title={switchHint}
            onClick={() => onChange(!isKaraoke)}
            className={cn(
                'inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full border px-2 py-1',
                'text-[0.6875rem] font-semibold leading-none shadow-sm transition-all sm:text-xs',
                'hover:shadow-md active:scale-[0.96]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isKaraoke
                    ? 'border-primary/45 bg-primary/12 text-primary hover:border-primary/60 hover:bg-primary/18'
                    : 'border-border/70 bg-background/90 text-foreground/85 hover:border-border hover:bg-background',
                className,
            )}
        >
            <span>{label}</span>
            <ArrowLeftRight
                className="h-3 w-3 shrink-0 opacity-75"
                strokeWidth={2.25}
                aria-hidden
            />
        </button>
    );
}

export function SearchHeaderRow({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-1.5 px-safe-offset pb-3 pt-safe-offset sm:gap-2',
                className,
            )}
        >
            {children}
        </div>
    );
}

type SearchFieldChromeProps = {
    children: ReactNode;
    className?: string;
    /** Overlay input uses slightly stronger focus ring. */
    variant?: 'bar' | 'overlay';
};

export function SearchFieldChrome({
    children,
    className,
    variant = 'bar',
}: SearchFieldChromeProps) {
    return (
        <div
            className={cn(
                'flex min-h-11 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-full border border-border/50 pr-1',
                variant === 'overlay'
                    ? 'bg-muted/40 pl-4 shadow-none focus-within:border-ring/60 focus-within:bg-muted/25 focus-within:ring-1 focus-within:ring-ring/40'
                    : 'bg-muted/35',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function SearchFieldTrailing({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex shrink-0 items-center gap-0.5 border-l border-border/40 pl-1',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function SearchHeaderBackButton({
    onClickAction,
    className,
}: {
    onClickAction: () => void;
    className?: string;
}) {
    const t = useScopedI18n('videoSearch');

    return (
        <button
            type="button"
            onClick={onClickAction}
            className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
            aria-label={t('back')}
        >
            <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
        </button>
    );
}

export function SearchFieldClearButton({
    onClickAction,
    className,
}: {
    onClickAction: () => void;
    className?: string;
}) {
    const t = useScopedI18n('videoSearch');

    return (
        <button
            type="button"
            onClick={onClickAction}
            className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                className,
            )}
            aria-label={t('clearSearch')}
        >
            <X className="h-4 w-4 text-muted-foreground" />
        </button>
    );
}

export function SearchVoiceMicButton({
    onClickAction,
    disabled = false,
    className,
}: {
    onClickAction: () => void;
    disabled?: boolean;
    className?: string;
}) {
    const t = useScopedI18n('videoSearch');

    return (
        <button
            type="button"
            onClick={onClickAction}
            disabled={disabled}
            className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                className,
            )}
            aria-label={t('voiceSearch')}
        >
            <Mic className="h-5 w-5" strokeWidth={1.75} />
        </button>
    );
}

type SearchFieldModeActionsProps = {
    isKaraoke: boolean;
    onKaraokeChangeAction: (isKaraoke: boolean) => void;
    isVoiceSupported?: boolean;
    onOpenVoiceAction?: () => void;
    voiceDisabled?: boolean;
};

/** Karaoke chip + optional mic — shared trailing controls inside the search field. */
export function SearchFieldModeActions({
    isKaraoke,
    onKaraokeChangeAction: onKaraokeChange,
    isVoiceSupported = false,
    onOpenVoiceAction,
    voiceDisabled = false,
}: SearchFieldModeActionsProps) {
    return (
        <SearchFieldTrailing>
            <KaraokeModeChip isKaraoke={isKaraoke} onChangeAction={onKaraokeChange} />
            {isVoiceSupported && onOpenVoiceAction ? (
                <SearchVoiceMicButton
                    onClickAction={onOpenVoiceAction}
                    disabled={voiceDisabled}
                />
            ) : null}
        </SearchFieldTrailing>
    );
}

type BrowseSearchHeaderProps = {
    onOpenSearchAction: () => void;
    onOpenVoiceAction?: () => void;
    isVoiceSupported?: boolean;
    isKaraoke: boolean;
    onKaraokeChangeAction: (isKaraoke: boolean) => void;
    className?: string;
};

export function BrowseSearchHeader({
    onOpenSearchAction,
    onOpenVoiceAction,
    isVoiceSupported = false,
    isKaraoke,
    onKaraokeChangeAction: onKaraokeChange,
    className,
}: BrowseSearchHeaderProps) {
    const t = useScopedI18n('videoSearch');

    return (
        <SearchHeaderRow className={className}>
            <SearchFieldChrome>
                <button
                    type="button"
                    onClick={onOpenSearchAction}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-muted/60"
                    aria-label={t('searchPlaceholder')}
                >
                    <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="truncate text-[0.9375rem] text-muted-foreground">
                        {t('searchPlaceholder')}
                    </span>
                </button>
                <SearchFieldModeActions
                    isKaraoke={isKaraoke}
                    onKaraokeChangeAction={onKaraokeChange}
                    isVoiceSupported={isVoiceSupported}
                    onOpenVoiceAction={onOpenVoiceAction}
                />
            </SearchFieldChrome>
        </SearchHeaderRow>
    );
}

type ResultsSearchHeaderProps = {
    query: string;
    isKaraoke: boolean;
    isVoiceSupported?: boolean;
    onBackAction: () => void;
    onOpenSearchAction: () => void;
    onOpenVoiceAction?: () => void;
    onClearQueryAction: () => void;
    onKaraokeChangeAction: (isKaraoke: boolean) => void;
    className?: string;
};

export function ResultsSearchHeader({
    query,
    isKaraoke,
    isVoiceSupported = false,
    onBackAction,
    onOpenSearchAction,
    onOpenVoiceAction,
    onClearQueryAction,
    onKaraokeChangeAction: onKaraokeChange,
    className,
}: ResultsSearchHeaderProps) {
    return (
        <SearchHeaderRow className={className}>
            <SearchHeaderBackButton onClickAction={onBackAction} />

            <SearchFieldChrome>
                <button
                    type="button"
                    onClick={onOpenSearchAction}
                    className="min-w-0 flex-1 truncate px-4 py-2.5 text-left text-[0.9375rem] focus-visible:outline-none"
                >
                    {query}
                </button>
                <SearchFieldClearButton onClickAction={onClearQueryAction} />
                <SearchFieldModeActions
                    isKaraoke={isKaraoke}
                    onKaraokeChangeAction={onKaraokeChange}
                    isVoiceSupported={isVoiceSupported}
                    onOpenVoiceAction={onOpenVoiceAction}
                />
            </SearchFieldChrome>
        </SearchHeaderRow>
    );
}
