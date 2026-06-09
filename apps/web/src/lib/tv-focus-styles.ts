import { cn } from '@/lib/utils';

/** YouTube TV accent — primary focus color on dark overlays. */
export const TV_ACCENT = '#3ea6ff';

/** Double-ring focus halo visible at 10-foot viewing distance. */
export const TV_FOCUS_HALO =
    'shadow-[0_0_0_3px_rgb(0_0_0/0.9),0_0_0_7px_#3ea6ff,0_0_28px_rgb(62_166_255/0.75)]';

export const TV_FOCUS_HALO_SOFT =
    'shadow-[0_0_0_2px_rgb(0_0_0/0.8),0_0_0_6px_#3ea6ff,0_0_20px_rgb(62_166_255/0.55)]';

/** Layout-stable border — always 4px; only color changes. */
const TV_BORDER_STABLE = 'border-4 border-solid';

type TvControlVariant = 'secondary' | 'primary';

/**
 * Circular transport button — plate size from tv-tokens.css; icon in .tv-transport-btn__icon.
 */
export function tvTransportButton(
    focused: boolean,
    variant: TvControlVariant = 'secondary',
    className?: string,
): string {
    return cn(
        'tv-transport-btn',
        variant === 'primary' ? 'tv-transport-btn--primary' : 'tv-transport-btn--secondary',
        focused ? 'tv-transport-btn--focused' : 'tv-transport-btn--idle',
        className,
    );
}

/** Lucide icon — stroke by default; Play triangle uses filled variant. */
export function tvTransportIconClass(options?: { filled?: boolean }): string {
    return cn(
        'tv-transport-btn__icon shrink-0',
        options?.filled && 'tv-transport-btn__icon--filled',
    );
}

/** Queue card shell — same plate language as transport buttons. */
export function tvFocusShellRect(focused: boolean, className?: string): string {
    return cn(
        'tv-queue-card rounded-2xl p-3 outline-none',
        TV_BORDER_STABLE,
        focused
            ? 'border-transparent bg-white/90 shadow-lg shadow-black/25'
            : cn('border-transparent bg-white/15', 'hover:bg-white/25'),
        className,
    );
}

export function tvQueueThumbFrame(
    focused: boolean,
    isNowPlaying: boolean,
    className?: string,
): string {
    return cn(
        'relative aspect-video overflow-hidden rounded-xl bg-zinc-800',
        !focused && isNowPlaying && 'ring-2 ring-inset ring-red-500/80',
        className,
    );
}

/** Fixed typography — dark text on focused white plate. */
export function tvQueueTitle(focused: boolean, className?: string): string {
    return cn(
        'line-clamp-2 text-base font-bold leading-snug md:text-lg',
        focused ? 'text-zinc-900' : 'text-zinc-100',
        className,
    );
}

export function tvQueueMetaLine(focused: boolean, className?: string): string {
    return cn(
        'line-clamp-1 text-sm md:text-base',
        focused ? 'font-medium text-zinc-600' : 'text-zinc-400',
        className,
    );
}

export function tvDefaultFocusLeaf(focused: boolean, className?: string): string {
    return cn(
        'rounded-xl outline-none',
        TV_BORDER_STABLE,
        'transition-[background-color,border-color,box-shadow] duration-150',
        focused
            ? cn('border-[#3ea6ff] bg-[#3ea6ff]/35', TV_FOCUS_HALO_SOFT)
            : 'border-transparent bg-white/5 hover:bg-white/12',
        className,
    );
}

/** Settings list row — accent plate on focus; high-contrast type for TV. */
export function tvSettingsRow(
    focused: boolean,
    options?: { destructive?: boolean; selected?: boolean },
    className?: string,
): string {
    return cn(
        'tv-settings-row flex w-full items-center gap-4 rounded-2xl px-5 py-3.5 outline-none',
        TV_BORDER_STABLE,
        'transition-[background-color,border-color,box-shadow,color] duration-200',
        focused
            ? cn(
                  'border-transparent bg-[#3ea6ff] text-white shadow-lg shadow-black/35',
                  options?.destructive && 'bg-red-600 text-white',
              )
            : options?.selected
              ? 'border-white/20 bg-white/28 text-white'
              : cn(
                    'border-transparent bg-white/20 text-zinc-50',
                    'hover:bg-white/26',
                    options?.destructive && 'text-red-200',
                ),
        className,
    );
}

export function tvSettingsLabel(
    focused: boolean,
    options?: { destructive?: boolean; selected?: boolean },
    className?: string,
): string {
    return cn(
        'tv-settings-label',
        focused ? 'text-white' : options?.selected ? 'text-white' : 'text-zinc-50',
        !focused && options?.destructive && 'text-red-200',
        className,
    );
}

export function tvSettingsIconPlate(focused: boolean, className?: string): string {
    return cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
        focused ? 'bg-black/25 text-white' : 'bg-white/16 text-white',
        className,
    );
}

/** Segmented / toggle option — same plate language as settings rows. */
export function tvSettingsSegment(focused: boolean, selected: boolean, className?: string): string {
    return tvSettingsRow(focused, { selected }, cn('justify-center px-5', className));
}

export function tvSettingsCloseButton(focused: boolean, className?: string): string {
    return tvSettingsRow(focused, undefined, cn('justify-center', className));
}

/** Room ID readout — non-interactive. */
export function tvSettingsRoomIdDisplay(className?: string): string {
    return cn(
        'rounded-2xl border-4 border-transparent bg-white/12 px-5 py-5 text-center',
        className,
    );
}

/** Settings section eyebrow. */
export function tvSettingsSectionLabel(className?: string): string {
    return cn('tv-settings-section-label', className);
}

export function tvLobbyButton(
    focused: boolean,
    variant: 'primary' | 'secondary' | 'ghost',
    className?: string,
): string {
    return cn(
        'w-full rounded-2xl font-bold outline-none',
        TV_BORDER_STABLE,
        'transition-[background-color,border-color,box-shadow,color] duration-150',
        variant === 'primary' &&
            cn(
                'h-14 text-lg',
                focused
                    ? cn('border-[#3ea6ff] bg-[#3ea6ff] text-white', TV_FOCUS_HALO_SOFT)
                    : 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
            ),
        variant === 'secondary' &&
            cn(
                'h-12 text-base',
                focused
                    ? cn('border-[#3ea6ff] bg-[#3ea6ff]/40 text-white', TV_FOCUS_HALO_SOFT)
                    : cn('border-transparent bg-zinc-700/70 text-white', 'hover:bg-zinc-600/80'),
            ),
        variant === 'ghost' &&
            cn(
                'h-11 text-base',
                focused
                    ? cn('border-transparent bg-[#3ea6ff]/30 text-white', TV_FOCUS_HALO_SOFT)
                    : cn(
                          'border-transparent text-zinc-400',
                          'hover:bg-white/10 hover:text-zinc-200',
                      ),
            ),
        className,
    );
}
