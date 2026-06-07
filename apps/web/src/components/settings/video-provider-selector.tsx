'use client';

import type { VideoSource } from '@vkara/youtube';
import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { TikTokBrandIcon, YouTubeBrandIcon } from '@/components/icons/brand-icons';
import {
    videoProviderBrandStyle,
    videoProviderSurfaceColors,
} from '@/components/settings/video-provider-brand';
import { cn } from '@/lib/utils';

const PROVIDERS = [
    {
        id: 'youtube' as const,
        Icon: YouTubeBrandIcon,
    },
    {
        id: 'tiktok' as const,
        Icon: TikTokBrandIcon,
    },
] satisfies ReadonlyArray<{
    id: VideoSource;
    Icon: typeof YouTubeBrandIcon;
}>;

type VideoProviderSelectorProps = {
    value: VideoSource;
    onChangeAction: (next: VideoSource) => void;
    labels: {
        group: string;
        providerYoutube: string;
        providerTiktok: string;
    };
};

export function VideoProviderSelector({
    value,
    onChangeAction,
    labels,
}: VideoProviderSelectorProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const prefersDark = !mounted || resolvedTheme !== 'light';

    const labelByProvider: Record<VideoSource, string> = {
        youtube: labels.providerYoutube,
        tiktok: labels.providerTiktok,
    };

    return (
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={labels.group}>
            {PROVIDERS.map(({ id, Icon }) => {
                const active = value === id;
                const brandStyle = videoProviderBrandStyle({ provider: id, active, prefersDark });
                const surfaces = videoProviderSurfaceColors({ provider: id, active, prefersDark });

                return (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChangeAction(id)}
                        style={{
                            borderColor: surfaces.border,
                            backgroundColor: surfaces.surface,
                        }}
                        className={cn(
                            'group relative flex min-h-[4.75rem] flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center transition-[transform,opacity,box-shadow] duration-200',
                            'active:scale-[0.98]',
                            !active && 'hover:opacity-95',
                        )}
                    >
                        {active ? (
                            <span
                                className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-white"
                                style={{ backgroundColor: surfaces.checkBackground }}
                                aria-hidden
                            >
                                <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                        ) : null}

                        <span
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-opacity duration-200 group-hover:opacity-90"
                            style={{
                                backgroundColor: surfaces.badge,
                                boxShadow: `inset 0 0 0 1px ${surfaces.badgeRing}`,
                            }}
                        >
                            <Icon
                                className="h-5 w-5 transition-opacity duration-200"
                                style={brandStyle}
                            />
                        </span>

                        <span
                            className={cn(
                                'text-sm font-semibold leading-none tracking-tight transition-colors',
                                active ? 'text-foreground' : 'text-muted-foreground',
                            )}
                        >
                            {labelByProvider[id]}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
