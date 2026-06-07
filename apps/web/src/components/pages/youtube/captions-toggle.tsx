'use client';

import { Subtitles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CaptionsToggleProps = {
    enabled: boolean;
    disabled?: boolean;
    label: string;
    triggerClassName?: string;
    onToggleAction: (enabled: boolean) => void;
};

/** On/off captions control when track/language selection is unavailable (e.g. TikTok embed). */
export function CaptionsToggle({
    enabled,
    disabled = false,
    label,
    triggerClassName,
    onToggleAction,
}: CaptionsToggleProps) {
    return (
        <Button
            type="button"
            variant={enabled ? 'secondary' : 'ghost'}
            size="icon"
            className={cn('h-11 w-11 shrink-0', triggerClassName)}
            disabled={disabled}
            aria-label={label}
            aria-pressed={enabled}
            onClick={() => onToggleAction(!enabled)}
        >
            <Subtitles className={cn('h-5 w-5', !enabled && 'opacity-50')} aria-hidden />
        </Button>
    );
}
