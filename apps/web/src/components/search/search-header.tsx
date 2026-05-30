'use client';

import { ChevronLeft, Mic, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type KaraokeModeSelectProps = {
    isKaraoke: boolean;
    onChange: (isKaraoke: boolean) => void;
};

function KaraokeModeSelect({ isKaraoke, onChange }: KaraokeModeSelectProps) {
    const t = useScopedI18n('videoSearch');

    return (
        <Select
            value={isKaraoke ? 'karaoke' : 'all'}
            onValueChange={(value) => {
                onChange(value === 'karaoke');
            }}
        >
            <SelectTrigger className="h-10 min-h-10 w-[4.5rem] shrink-0 rounded-full border-border/70 bg-muted/30 px-2 py-0 text-xs leading-none shadow-none sm:h-11 sm:min-h-11 sm:w-[5rem] sm:text-sm">
                <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t('allMode')}</SelectItem>
                <SelectItem value="karaoke">{t('karaokeMode')}</SelectItem>
            </SelectContent>
        </Select>
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
        <div
            className={cn(
                'flex min-w-0 items-center gap-2 px-safe-offset pb-3 pt-safe-offset',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenSearchAction}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-full border border-border/50 bg-muted/35 px-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted/60"
                aria-label={t('searchPlaceholder')}
            >
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="truncate text-[0.9375rem] text-muted-foreground">
                    {t('searchPlaceholder')}
                </span>
            </button>

            {isVoiceSupported && onOpenVoiceAction ? (
                <button
                    type="button"
                    onClick={onOpenVoiceAction}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('voiceSearch')}
                >
                    <Mic className="h-5 w-5" strokeWidth={1.75} />
                </button>
            ) : null}

            <KaraokeModeSelect isKaraoke={isKaraoke} onChange={onKaraokeChange} />
        </div>
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
    const t = useScopedI18n('videoSearch');

    return (
        <div
            className={cn(
                'flex min-w-0 items-center gap-1 px-1 pb-3 pt-safe-offset sm:gap-1.5 sm:px-2',
                className,
            )}
        >
            <button
                type="button"
                onClick={onBackAction}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t('back')}
            >
                <ChevronLeft className="h-7 w-7" strokeWidth={1.75} />
            </button>

            <div className="flex min-h-11 min-w-0 flex-1 items-center overflow-hidden rounded-full border border-border/50 bg-muted/35 pl-4 pr-1">
                <button
                    type="button"
                    onClick={onOpenSearchAction}
                    className="min-w-0 flex-1 truncate py-2.5 text-left text-[0.9375rem] focus-visible:outline-none"
                >
                    {query}
                </button>
                <button
                    type="button"
                    onClick={onClearQueryAction}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('clearSearch')}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>
            </div>

            {isVoiceSupported && onOpenVoiceAction ? (
                <button
                    type="button"
                    onClick={onOpenVoiceAction}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t('voiceSearch')}
                >
                    <Mic className="h-5 w-5" strokeWidth={1.75} />
                </button>
            ) : null}

            <KaraokeModeSelect isKaraoke={isKaraoke} onChange={onKaraokeChange} />
        </div>
    );
}
