'use client';

import { useCallback } from 'react';

import { prefetchRemoteShell } from '@/hooks/use-layout-chunk-prefetch';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';
import { useYouTubeStore } from '@/store/youtubeStore';

type TvIdleLayoutSwitchProps = {
    effectiveLayoutMode: YouTubeStoreLayoutMode;
    className?: string;
};

type IdleLayoutChoice = 'player' | 'both';

function toChoice(mode: YouTubeStoreLayoutMode): IdleLayoutChoice {
    return mode === 'both' ? 'both' : 'player';
}

export function TvIdleLayoutSwitch({ effectiveLayoutMode, className }: TvIdleLayoutSwitchProps) {
    const t = useScopedI18n('youtubePage');
    const setLayoutMode = useYouTubeStore((s) => s.setLayoutMode);
    const setCurrentTab = useYouTubeStore((s) => s.setCurrentTab);

    const active = toChoice(effectiveLayoutMode);

    const select = useCallback(
        (choice: IdleLayoutChoice) => {
            if (choice === active) {
                return;
            }
            if (choice === 'both') {
                prefetchRemoteShell();
                setLayoutMode('both', 'user');
                setCurrentTab('search');
                return;
            }
            setLayoutMode('player', 'user');
            setCurrentTab('queue');
        },
        [active, setCurrentTab, setLayoutMode],
    );

    const options: { value: IdleLayoutChoice; label: string; aria: string }[] = [
        { value: 'player', label: t('tvLayoutTv'), aria: t('tvLayoutTvAria') },
        { value: 'both', label: t('tvLayoutLaptop'), aria: t('tvLayoutLaptopAria') },
    ];

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1 text-sm font-medium opacity-40 transition-opacity duration-300 hover:opacity-100',
                className,
            )}
            role="group"
            aria-label={t('tvLayoutGroupLabel')}
        >
            {options.map((option, index) => (
                <span key={option.value} className="inline-flex items-center">
                    {index > 0 ? (
                        <span className="select-none px-0.5 text-zinc-600" aria-hidden>
                            /
                        </span>
                    ) : null}
                    <button
                        type="button"
                        aria-label={option.aria}
                        aria-pressed={active === option.value}
                        onClick={() => select(option.value)}
                        className={cn(
                            'rounded-full px-1 py-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                            active === option.value
                                ? 'text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300',
                        )}
                    >
                        {option.label}
                    </button>
                </span>
            ))}
        </div>
    );
}
