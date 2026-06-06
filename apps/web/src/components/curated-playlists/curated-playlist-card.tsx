'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { ListMusic } from 'lucide-react';

import { VIDEO_LIST_ROW_HEIGHT } from '@/components/pages/youtube/VideoListItem';
import { VideoListThumbnail } from '@/components/pages/youtube/video-list-thumbnail';
import { useScopedI18n } from '@/locales/client';
import { resolveCuratedPlaylistThumbnail } from '@/lib/curated-playlist-thumbnail';
import { usePlaylistDetailsCache } from '@/hooks/use-playlist-details-cache';
import { cn } from '@/lib/utils';

type CuratedPlaylistCardProps = {
    listId: string;
    onOpen: () => void;
    /** `list` matches {@link VideoListItem}; `tile` is for horizontal browse carousel only. */
    layout?: 'list' | 'tile';
    className?: string;
};

type CuratedPlaylistMetaProps = {
    isLoading: boolean;
    hasError: boolean;
    title?: string;
    videoCount?: number;
    titleClassName: string;
};

function CuratedPlaylistMeta({
    isLoading,
    hasError,
    title,
    videoCount,
    titleClassName,
}: CuratedPlaylistMetaProps) {
    const t = useScopedI18n('curatedPlaylists');

    if (isLoading) {
        return (
            <>
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </>
        );
    }

    return (
        <>
            <p className={titleClassName}>
                {hasError ? t('cardLoadError') : (title ?? t('untitledPlaylist'))}
            </p>
            {videoCount !== undefined ? (
                <p className="text-xs text-muted-foreground">{t('videoCount', { count: videoCount })}</p>
            ) : null}
        </>
    );
}

function CuratedPlaylistThumbPlaceholder({ isLoading }: { isLoading: boolean }) {
    if (isLoading) {
        return <div className="h-full w-full animate-pulse bg-muted-foreground/10" />;
    }

    return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
            <ListMusic className="h-6 w-6" aria-hidden />
        </div>
    );
}

export function CuratedPlaylistCard({
    listId,
    onOpen,
    layout = 'list',
    className,
}: CuratedPlaylistCardProps) {
    const t = useScopedI18n('curatedPlaylists');
    const { getEntry, prefetch } = usePlaylistDetailsCache();
    const entry = getEntry(listId);

    useEffect(() => {
        void prefetch(listId, { videoLimit: 5 }).catch(() => undefined);
    }, [listId, prefetch]);

    const details = entry?.data;
    const title = details?.playlist.title;
    const videoCount = details?.playlist.videoCount;
    const thumbUrl = resolveCuratedPlaylistThumbnail(details, listId);
    const isLoading = !details && !entry?.error;
    const hasError = Boolean(entry?.error);
    const ariaLabel = isLoading
        ? t('untitledPlaylist')
        : hasError
          ? t('cardLoadError')
          : (title ?? t('untitledPlaylist'));

    if (layout === 'tile') {
        return (
            <button
                type="button"
                onClick={onOpen}
                aria-label={ariaLabel}
                className={cn(
                    'flex w-[11.5rem] shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-xl border border-border/70 bg-card text-left transition-colors',
                    'touch-manipulation hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] active:bg-accent/60',
                    className,
                )}
            >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {thumbUrl ? (
                        <Image
                            src={thumbUrl}
                            alt=""
                            fill
                            sizes="184px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="flex aspect-video items-center justify-center">
                            <CuratedPlaylistThumbPlaceholder isLoading={isLoading} />
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-1 p-3">
                    <CuratedPlaylistMeta
                        isLoading={isLoading}
                        hasError={hasError}
                        title={title}
                        videoCount={videoCount}
                        titleClassName="line-clamp-2 text-sm font-medium leading-snug"
                    />
                </div>
            </button>
        );
    }

    return (
        <div className={cn('w-full overflow-hidden rounded-lg text-left text-sm', className)}>
            <button
                type="button"
                onClick={onOpen}
                aria-label={ariaLabel}
                className={cn(
                    'flex w-full cursor-pointer items-start gap-3 p-2 text-left',
                    'hover:bg-accent/50 active:bg-accent/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                style={{ height: VIDEO_LIST_ROW_HEIGHT }}
            >
                <VideoListThumbnail
                    src={thumbUrl}
                    fallback={<CuratedPlaylistThumbPlaceholder isLoading={isLoading} />}
                />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden">
                    <CuratedPlaylistMeta
                        isLoading={isLoading}
                        hasError={hasError}
                        title={title}
                        videoCount={videoCount}
                        titleClassName="line-clamp-2 break-words text-sm font-medium leading-snug"
                    />
                </div>
            </button>
        </div>
    );
}
