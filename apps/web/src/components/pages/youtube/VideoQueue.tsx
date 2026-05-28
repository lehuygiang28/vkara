'use client';

import { useCallback, useState } from 'react';
import { Trash2, MoveUp, Shuffle, ListMusic } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { YouTubeVideo } from '@/types/youtube.type';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { TooltipButton } from '@/components/tooltip-button';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListToolbar } from './video-list-toolbar';
import { Input } from '@/components/ui/input';

export function VideoQueue() {
    const { room } = useYouTubeStore();
    const {
        handleRemoveVideoFromQueue,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
        handleImportPlaylist,
    } = usePlayerAction();
    const t = useScopedI18n('videoQueue');
    const [importPlaylistValue, setImportPlaylistValue] = useState('');

    const handlerConfirmImportPlaylist = () => {
        handleImportPlaylist(importPlaylistValue);
        setImportPlaylistValue('');
    };

    const renderActions = useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'priority',
                        label: t('moveToTop'),
                        buttonText: t('moveToTop'),
                        icon: <MoveUp />,
                        tone: 'priority',
                        onClick: () => {
                            closeMenu();
                            handleMoveVideoToTop(video);
                        },
                    },
                    {
                        id: 'remove',
                        label: t('remove'),
                        buttonText: t('remove'),
                        icon: <Trash2 />,
                        tone: 'destructive',
                        onClick: () => {
                            closeMenu();
                            handleRemoveVideoFromQueue(video);
                        },
                    },
                ]}
            />
        ),
        [t, handleMoveVideoToTop, handleRemoveVideoFromQueue],
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            <VideoListToolbar
                trailing={
                    <TooltipButton
                        tooltipContent={t('importPlaylist')}
                        buttonText={t('importPlaylist')}
                        icon={<ListMusic />}
                        iconOnly
                        onConfirm={handlerConfirmImportPlaylist}
                        confirmMode
                        confirmContent={
                            <>
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">{t('importPlaylist')}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {t('importPlaylistDescription')}
                                    </p>
                                </div>
                                <div className="flex">
                                    <Input
                                        id="playlist-import"
                                        value={importPlaylistValue}
                                        onChange={(e) => setImportPlaylistValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handlerConfirmImportPlaylist();
                                        }}
                                        className="col-span-2 h-8"
                                        placeholder={t('importPlaylistPlaceholder')}
                                    />
                                </div>
                            </>
                        }
                        variant="outline"
                    />
                }
            >
                {(room?.videoQueue?.length || 0) > 2 ? (
                    <TooltipButton
                        tooltipContent={t('shuffle')}
                        buttonText={t('shuffle')}
                        icon={<Shuffle />}
                        onConfirm={handleShuffleQueue}
                    />
                ) : null}
                {(room?.videoQueue?.length || 0) > 0 ? (
                    <TooltipButton
                        tooltipContent={t('clearQueue')}
                        buttonText={t('clearQueue')}
                        icon={<Trash2 />}
                        onConfirm={handleClearQueue}
                        confirmMode
                        confirmContent={t('clearQueueConfirm')}
                        variant="destructive"
                    />
                ) : null}
            </VideoListToolbar>
            <VideoList
                keyPrefix="queue-list"
                videos={room?.videoQueue || []}
                emptyMessage={t('noVideos')}
                renderActions={renderActions}
            />
        </div>
    );
}
