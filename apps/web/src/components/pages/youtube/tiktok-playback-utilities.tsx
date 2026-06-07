'use client';

import { Subtitles, Volume2, VolumeX, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type UtilityToggleProps = {
    pressed: boolean;
    disabled?: boolean;
    label: string;
    icon: LucideIcon;
    onClickAction: () => void;
};

function UtilityToggle({
    pressed,
    disabled = false,
    label,
    icon: Icon,
    onClickAction,
}: UtilityToggleProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClickAction}
            className={cn(
                'inline-flex min-h-11 min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 transition-[transform,colors,box-shadow] duration-200',
                'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40',
                'min-[400px]:min-w-[5.5rem] min-[400px]:flex-row min-[400px]:gap-2 min-[400px]:px-4',
                pressed
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
            )}
        >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="max-w-[4.5rem] truncate text-[11px] font-medium leading-none min-[400px]:max-w-none min-[400px]:text-xs">
                {label}
            </span>
        </button>
    );
}

type TikTokPlaybackUtilitiesProps = {
    isMuted: boolean;
    captionsEnabled: boolean;
    captionsDisabled?: boolean;
    disabled?: boolean;
    groupLabel: string;
    soundOnLabel: string;
    soundOffLabel: string;
    captionsLabel: string;
    className?: string;
    onMuteToggleAction: () => void;
    onCaptionsToggleAction: (enabled: boolean) => void;
};

/** Centered mute + captions toggles for TikTok (no volume slider). */
export function TikTokPlaybackUtilities({
    isMuted,
    captionsEnabled,
    captionsDisabled = false,
    disabled = false,
    groupLabel,
    soundOnLabel,
    soundOffLabel,
    captionsLabel,
    className,
    onMuteToggleAction,
    onCaptionsToggleAction,
}: TikTokPlaybackUtilitiesProps) {
    const soundLabel = isMuted ? soundOffLabel : soundOnLabel;

    return (
        <div className={cn('flex justify-center', className)}>
            <div
                role="group"
                aria-label={groupLabel}
                className="inline-flex w-full max-w-sm items-stretch rounded-xl border border-border/50 bg-muted/25 p-1 min-[400px]:p-1.5"
            >
                <UtilityToggle
                    pressed={!isMuted}
                    disabled={disabled}
                    label={soundLabel}
                    icon={isMuted ? VolumeX : Volume2}
                    onClickAction={onMuteToggleAction}
                />
                <div aria-hidden className="my-2 w-px shrink-0 bg-border/60" />
                <UtilityToggle
                    pressed={captionsEnabled}
                    disabled={disabled || captionsDisabled}
                    label={captionsLabel}
                    icon={Subtitles}
                    onClickAction={() => onCaptionsToggleAction(!captionsEnabled)}
                />
            </div>
        </div>
    );
}
