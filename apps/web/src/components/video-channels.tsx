'use client';

import { BadgeCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { normalizeVideoChannels, type YouTubeChannel, type YouTubeVideo } from '@vkara/youtube';

export type VideoChannelsTone = 'muted' | 'emphasis' | 'inverse';
export type VideoChannelsDensity = 'default' | 'compact';

interface VideoChannelsProps {
    video: Pick<YouTubeVideo, 'channels'> & {
        channel?: { name: string; verified?: boolean };
    };
    tone?: VideoChannelsTone;
    /** Max wrapped lines before clipping (default 2). */
    maxLines?: 1 | 2 | 3;
    /** compact: single-line row for tight spaces. */
    density?: VideoChannelsDensity;
    /** Allow long channel names to wrap instead of truncating (mini-player). */
    allowNameWrap?: boolean;
    align?: 'start' | 'center';
    className?: string;
}

const toneClassName: Record<VideoChannelsTone, string> = {
    muted: 'text-[13px] leading-4 font-normal text-muted-foreground',
    emphasis: 'text-sm leading-4 font-medium text-foreground/90',
    inverse: 'text-sm leading-4 font-semibold text-white',
};

const maxLinesClassName: Record<1 | 2 | 3, string> = {
    1: 'max-h-[1.125rem]',
    2: 'max-h-[2.125rem]',
    3: 'max-h-[3.25rem]',
};

const maxLinesWrapClassName: Record<1 | 2 | 3, string> = {
    1: 'max-h-[1.125rem]',
    2: 'max-h-[2.5rem]',
    3: 'max-h-[3.75rem]',
};

const badgeClassName: Record<VideoChannelsTone, string> = {
    muted: 'size-3.5 shrink-0 fill-sky-500 text-background dark:fill-sky-400',
    emphasis: 'size-3.5 shrink-0 fill-sky-500 text-background dark:fill-sky-400',
    inverse: 'size-3.5 shrink-0 fill-sky-400 text-zinc-950',
};

const separatorClassName: Record<VideoChannelsTone, string> = {
    muted: 'shrink-0 px-0.5 font-normal text-muted-foreground/70',
    emphasis: 'shrink-0 px-0.5 font-normal text-muted-foreground/70',
    inverse: 'shrink-0 px-0.5 font-normal text-white/70',
};

const overflowHintClassName: Record<VideoChannelsTone, string> = {
    muted: 'shrink-0 font-normal text-muted-foreground/80',
    emphasis: 'shrink-0 font-normal text-muted-foreground/80',
    inverse: 'shrink-0 font-normal text-white/75',
};

function channelSeparatorLabel(index: number, total: number, andLabel: string): string | undefined {
    if (index === 0) {
        return undefined;
    }
    if (total === 2 && index === 1) {
        return andLabel;
    }
    if (index === total - 1) {
        return andLabel;
    }
    return ',';
}

function ChannelUnit({
    channel,
    tone,
    shrink = false,
    allowNameWrap = false,
    className,
}: {
    channel: YouTubeChannel;
    tone: VideoChannelsTone;
    shrink?: boolean;
    allowNameWrap?: boolean;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex min-w-0 max-w-full items-center gap-0.5 align-middle',
                allowNameWrap ? 'whitespace-normal' : 'whitespace-nowrap',
                shrink ? 'shrink' : 'shrink-0',
                className,
            )}
        >
            <span
                className={cn(
                    'min-w-0',
                    allowNameWrap ? 'break-words [overflow-wrap:anywhere]' : 'truncate',
                )}
            >
                {channel.name}
            </span>
            {channel.verified ? (
                <BadgeCheck
                    className={badgeClassName[tone]}
                    strokeWidth={2.5}
                    aria-label="Verified channel"
                />
            ) : null}
        </span>
    );
}

export function VideoChannels({
    video,
    tone = 'muted',
    maxLines = 2,
    density = 'default',
    allowNameWrap = false,
    align = 'start',
    className,
}: VideoChannelsProps) {
    const t = useScopedI18n('videoChannels');
    const channels = normalizeVideoChannels(video);
    const andLabel = t('and');

    if (channels.length === 0) {
        return null;
    }

    const alignClassName = align === 'center' ? 'justify-center' : 'justify-start';
    const isCompact = density === 'compact';
    const allowWrap = allowNameWrap && !isCompact;
    /** Multi-channel rows wrap between artists; only single-channel uses intra-name wrap. */
    const perChannelNameWrap = allowWrap && channels.length === 1;
    const visibleChannels = isCompact && channels.length > 2 ? channels.slice(0, 1) : channels;
    const hiddenCount = isCompact && channels.length > 2 ? channels.length - 1 : 0;

    return (
        <div
            className={cn(
                'flex w-full min-w-0 flex-wrap items-center',
                isCompact
                    ? 'flex-nowrap gap-x-0.5 overflow-hidden'
                    : 'gap-x-0 gap-y-0.5 overflow-hidden',
                allowWrap ? maxLinesWrapClassName[maxLines] : maxLinesClassName[maxLines],
                toneClassName[tone],
                alignClassName,
                className,
            )}
        >
            {visibleChannels.map((channel, index) => {
                const separator = channelSeparatorLabel(index, visibleChannels.length, andLabel);

                return (
                    <span
                        key={`${channel.name}-${index}`}
                        className="inline-flex min-w-0 max-w-full items-center"
                    >
                        {separator ? (
                            <span className={separatorClassName[tone]} aria-hidden>
                                {separator}
                            </span>
                        ) : null}
                        <ChannelUnit
                            channel={channel}
                            tone={tone}
                            allowNameWrap={perChannelNameWrap}
                            shrink={
                                allowWrap || (isCompact && index === visibleChannels.length - 1)
                            }
                        />
                    </span>
                );
            })}
            {hiddenCount > 0 ? (
                <span className={overflowHintClassName[tone]}>
                    {t('moreChannels', { count: hiddenCount })}
                </span>
            ) : null}
        </div>
    );
}
