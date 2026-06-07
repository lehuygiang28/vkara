'use client';

import { LayoutModeSwitch } from '@/components/layout-mode-switch';
import { cn } from '@/lib/utils';
import type { YouTubeStoreLayoutMode } from '@/store/youtubeStore';

type TvIdleLayoutSwitchProps = {
    effectiveLayoutMode: YouTubeStoreLayoutMode;
    className?: string;
};

export function TvIdleLayoutSwitch({ effectiveLayoutMode, className }: TvIdleLayoutSwitchProps) {
    const activeChoice = effectiveLayoutMode === 'both' ? 'both' : 'player';

    return (
        <LayoutModeSwitch
            choices={['player', 'both']}
            activeChoice={activeChoice}
            tone="overlay"
            className={cn(className)}
        />
    );
}
