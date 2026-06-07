'use client';

import { useMemo } from 'react';

import { useLayoutModeChange, type LayoutModeChoice } from '@/hooks/use-layout-mode-change';
import { useI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type LayoutModeSwitchTone = 'overlay' | 'overlay-visible' | 'inline';

type LayoutModeSwitchProps = {
    choices?: LayoutModeChoice[];
    /** Override pressed state (e.g. TV idle uses effective layout, not stored auto). */
    activeChoice?: LayoutModeChoice;
    tone?: LayoutModeSwitchTone;
    className?: string;
};

const DEFAULT_CHOICES: LayoutModeChoice[] = ['auto', 'remote', 'player', 'both'];

/** Wrong-mode recovery UIs: auto, phone remote, TV — no laptop/both. */
export const RECOVERY_MODE_CHOICES: LayoutModeChoice[] = ['auto', 'remote', 'player'];

const CHOICE_LABELS = {
    auto: 'youtubePage.layoutAuto',
    remote: 'youtubePage.layoutRemoteShort',
    player: 'youtubePage.tvLayoutTv',
    both: 'youtubePage.layoutBoth',
} as const;

const CHOICE_ARIA = {
    auto: 'youtubePage.layoutAutoDesc',
    remote: 'youtubePage.layoutRemoteDesc',
    player: 'youtubePage.tvLayoutTvAria',
    both: 'youtubePage.layoutBothAria',
} as const;

const TONE_STYLES: Record<
    LayoutModeSwitchTone,
    {
        group: string;
        active: string;
        inactive: string;
        separator: string;
        focus: string;
    }
> = {
    overlay: {
        group: 'opacity-40 transition-opacity duration-300 hover:opacity-100',
        active: 'text-zinc-100',
        inactive: 'text-zinc-500 hover:text-zinc-300',
        separator: 'text-zinc-600',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    },
    'overlay-visible': {
        group: '',
        active: 'text-zinc-50',
        inactive: 'text-zinc-400 hover:text-zinc-200',
        separator: 'text-zinc-600',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    },
    inline: {
        group: '',
        active: 'text-foreground',
        inactive: 'text-muted-foreground hover:text-foreground/80',
        separator: 'text-muted-foreground/50',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    },
};

export function LayoutModeSwitch({
    choices = DEFAULT_CHOICES,
    activeChoice,
    tone = 'inline',
    className,
}: LayoutModeSwitchProps) {
    const t = useI18n();
    const { selectedChoice, changeLayoutMode } = useLayoutModeChange();
    const active = activeChoice ?? selectedChoice;
    const styles = TONE_STYLES[tone];

    const options = useMemo(
        () =>
            choices.map((value) => ({
                value,
                label: t(CHOICE_LABELS[value]),
                aria: t(CHOICE_ARIA[value]),
            })),
        [choices, t],
    );

    return (
        <div
            className={cn(
                'inline-flex max-w-full flex-wrap items-center justify-center gap-x-0.5 gap-y-1 text-sm font-medium sm:text-sm',
                styles.group,
                className,
            )}
            role="group"
            aria-label={t('youtubePage.tvLayoutGroupLabel')}
        >
            {options.map((option, index) => (
                <span key={option.value} className="inline-flex items-center">
                    {index > 0 ? (
                        <span className={cn('select-none px-0.5', styles.separator)} aria-hidden>
                            /
                        </span>
                    ) : null}
                    <button
                        type="button"
                        aria-label={option.aria}
                        aria-pressed={active === option.value}
                        onClick={() => {
                            if (active === option.value) {
                                return;
                            }
                            changeLayoutMode(option.value);
                        }}
                        className={cn(
                            'cursor-pointer rounded-full px-2 py-2 transition-colors duration-200 sm:px-2.5 sm:py-1.5',
                            styles.focus,
                            active === option.value ? styles.active : styles.inactive,
                        )}
                    >
                        {option.label}
                    </button>
                </span>
            ))}
        </div>
    );
}
