'use client';

import { BadgeCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useScopedI18n } from '@/locales/client';
import { normalizeVideoChannels, type YouTubeChannel, type YouTubeVideo } from '@vkara/shared-types';

export type VideoChannelsTone = 'muted' | 'emphasis' | 'inverse';

interface VideoChannelsProps {
    video: Pick<YouTubeVideo, 'channels'> & {
        channel?: { name: string; verified?: boolean };
    };
    tone?: VideoChannelsTone;
    /** Max wrapped lines before clipping (default 2). */
    maxLines?: 2 | 3;
    className?: string;
}

const toneClassName: Record<VideoChannelsTone, string> = {
    muted: 'text-[13px] leading-4 font-normal text-muted-foreground',
    emphasis: 'text-sm leading-4 font-medium text-foreground/90',
    inverse: 'text-sm leading-4 font-semibold text-white',
};

const maxLinesClassName: Record<2 | 3, string> = {
    2: 'max-h-8',
    3: 'max-h-12',
};

const badgeClassName: Record<VideoChannelsTone, string> = {
    muted: 'size-3.5 shrink-0 fill-none text-sky-500 dark:text-sky-400',
    emphasis: 'size-3.5 shrink-0 fill-none text-sky-500 dark:text-sky-400',
    inverse: 'size-3.5 shrink-0 fill-none text-sky-400',
};

const separatorClassName: Record<VideoChannelsTone, string> = {
    muted: 'font-normal text-muted-foreground',
    emphasis: 'font-normal text-muted-foreground',
    inverse: 'font-normal text-white/90',
};

function ChannelName({
    channel,
    tone,
}: {
    channel: YouTubeChannel;
    tone: VideoChannelsTone;
}) {
    return (
        <span className="inline-flex min-w-0 items-center gap-0.5">
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{channel.name}</span>
            {channel.verified ? (
                <BadgeCheck
                    className={badgeClassName[tone]}
                    strokeWidth={2.25}
                    aria-hidden
                />
            ) : null}
        </span>
    );
}

function ChannelSeparator({
    tone,
    children,
}: {
    tone: VideoChannelsTone;
    children: string;
}) {
    return (
        <span className={cn('shrink-0', separatorClassName[tone])} aria-hidden>
            {children}
        </span>
    );
}

/** Separator + channel wrap together so "and" is not orphaned on its own line. */
function ChannelSegment({
    channel,
    tone,
    separator,
}: {
    channel: YouTubeChannel;
    tone: VideoChannelsTone;
    separator?: string;
}) {
    return (
        <span className="inline-flex max-w-full min-w-0 items-center gap-x-1">
            {separator ? <ChannelSeparator tone={tone}>{separator}</ChannelSeparator> : null}
            <ChannelName channel={channel} tone={tone} />
        </span>
    );
}

export function VideoChannels({
    video,
    tone = 'muted',
    maxLines = 2,
    className,
}: VideoChannelsProps) {
    const t = useScopedI18n('videoChannels');
    const channels = normalizeVideoChannels(video);
    const andLabel = t('and');

    if (channels.length === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex w-full min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 overflow-hidden',
                maxLinesClassName[maxLines],
                toneClassName[tone],
                className,
            )}
        >
            {channels.map((channel, index) => {
                const isLast = index === channels.length - 1;
                const separator =
                    index === 0 ? undefined : isLast ? andLabel : ',';

                return (
                    <ChannelSegment
                        key={`${channel.name}-${index}`}
                        channel={channel}
                        tone={tone}
                        separator={separator}
                    />
                );
            })}
        </div>
    );
}
