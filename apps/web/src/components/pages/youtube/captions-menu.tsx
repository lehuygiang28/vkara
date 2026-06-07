'use client';

import type { CaptionTrack } from '@vkara/youtube';
import { Subtitles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const CAPTIONS_OFF_VALUE = '__off__';

type CaptionsMenuProps = {
    captionsEnabled: boolean;
    captionsLanguage: string;
    tracks: readonly CaptionTrack[];
    loading: boolean;
    unavailable: boolean;
    disabled?: boolean;
    loadingLabel: string;
    emptyLabel: string;
    offLabel: string;
    menuLabel: string;
    triggerClassName?: string;
    onSelectAction: (languageCode: string | null) => void;
};

export function CaptionsMenu({
    captionsEnabled,
    captionsLanguage,
    tracks,
    loading,
    unavailable,
    disabled = false,
    loadingLabel,
    emptyLabel,
    offLabel,
    menuLabel,
    triggerClassName,
    onSelectAction,
}: CaptionsMenuProps) {
    const selectedValue = captionsEnabled ? captionsLanguage : CAPTIONS_OFF_VALUE;
    const menuDisabled = disabled || loading;

    const handleValueChange = (value: string) => {
        if (value === CAPTIONS_OFF_VALUE) {
            onSelectAction(null);
            return;
        }
        onSelectAction(value);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant={captionsEnabled ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn('h-11 w-11 shrink-0', triggerClassName)}
                    disabled={disabled}
                    aria-label={menuLabel}
                    aria-haspopup="menu"
                >
                    <Subtitles
                        className={cn('h-5 w-5', !captionsEnabled && 'opacity-50')}
                        aria-hidden
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">
                <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
                {loading ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">{loadingLabel}</p>
                ) : null}
                {!loading && unavailable ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyLabel}</p>
                ) : null}
                <DropdownMenuRadioGroup value={selectedValue} onValueChange={handleValueChange}>
                    <DropdownMenuRadioItem value={CAPTIONS_OFF_VALUE}>
                        {offLabel}
                    </DropdownMenuRadioItem>
                    {!loading && tracks.length > 0 ? (
                        <>
                            <DropdownMenuSeparator />
                            {tracks.map((track) => (
                                <DropdownMenuRadioItem
                                    key={track.languageCode}
                                    value={track.languageCode}
                                    disabled={menuDisabled}
                                >
                                    {track.displayName}
                                    {track.kind === 'asr' ? ' (auto)' : ''}
                                </DropdownMenuRadioItem>
                            ))}
                        </>
                    ) : null}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
