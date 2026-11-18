'use client';

import { useCallback } from 'react';
import { Trash2, MoveUp, Shuffle, ListMusic, Search, ListVideo } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { pendingAutoPlayCandidate } from '@vkara/room';
import type { YouTubeVideo } from '@vkara/youtube';
import { useYouTubeStore } from '@/store/youtubeStore';
import { usePlayerAction } from '@/hooks/use-player-action';

import { CuratedPlaylistsPanel } from '@/components/curated-playlists/curated-playlists-panel';
import { TooltipButton } from '@/components/tooltip-button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ensureConnectedAndSend } from '@/lib/ensure-ws-send';
import { isTikTokProviderActive } from '@/lib/video-provider';
import { useCuratedStore } from '@/store/curatedStore';
import { VideoList, type VideoListActionHelpers } from './VideoList';
import { VideoListItem } from './VideoListItem';
import { VideoListActionBar } from './video-list-action-bar';
import { VideoListToolbar } from './video-list-toolbar';
import { VideoListEmptyState } from './video-list-empty-state';
import { useCabinetSaveAction } from './use-cabinet-save-action';

export function VideoQueue() {
    const { room, setCurrentTab } = useYouTubeStore();
    const {
        handleRemoveVideoFromQueue,
        handleMoveVideoToTop,
        handleShuffleQueue,
        handleClearQueue,
    } = usePlayerAction();
    const t = useScopedI18n('videoQueue');
    const tSearch = useScopedI18n('videoSearch');
    const autoPlayCandidate = pendingAutoPlayCandidate(room);
    const cabinetSaveAction = useCabinetSaveAction();
    const setImportPlaylistPanelOpen = useCuratedStore((state) => state.setImportPlaylistPanelOpen);
    const hideYoutubeOnlyActions = isTikTokProviderActive();

    const renderActions = useCallback(
        (video: YouTubeVideo, { closeMenu }: VideoListActionHelpers) => (
            <VideoListActionBar
                actions={[
                    {
                        id: 'priority',
                        label: t('moveToTop'),
                        buttonText: t('moveToTopShort'),
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
                    cabinetSaveAction(video, { closeMenu }),
                ]}
            />
        ),
        [t, handleMoveVideoToTop, handleRemoveVideoFromQueue, cabinetSaveAction],
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            <VideoListToolbar
                leading={
                    <>
                        {!hideYoutubeOnlyActions ? (
                            <TooltipButton
                                tooltipContent={t('importPlaylistDescription')}
                                buttonText={t('importPlaylist')}
                                icon={<ListMusic />}
                                onConfirm={() => setImportPlaylistPanelOpen(true)}
                            />
                        ) : null}
                        {(room?.videoQueue?.length || 0) > 2 ? (
                            <TooltipButton
                                tooltipContent={t('shuffle')}
                                buttonText={t('shuffle')}
                                icon={<Shuffle />}
                                onConfirm={handleShuffleQueue}
                            />
                        ) : null}
                    </>
                }
                trailing={
                    (room?.videoQueue?.length || 0) > 0 ? (
                        <TooltipButton
                            tooltipContent={t('clearQueue')}
                            buttonText={t('clearQueue')}
                            icon={<Trash2 />}
                            onConfirm={handleClearQueue}
                            confirmMode
                            confirmContent={t('clearQueueConfirm')}
                            variant="destructive"
                        />
                    ) : null
                }
            />
            {room ? (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b px-page-gutter py-2.5">
                    <div className="min-w-0 space-y-1">
                        <Label htmlFor="auto-play-next">{t('autoPlayNext')}</Label>
                        <p className="text-xs text-muted-foreground">{t('autoPlayNextHint')}</p>
                    </div>
                    <Switch
                        id="auto-play-next"
                        checked={room.autoPlayNext ?? false}
                        onCheckedChange={(enabled) =>
                            ensureConnectedAndSend({ type: 'setAutoPlayNext', enabled })
                        }
                    />
                </div>
            ) : null}
            <VideoList
                videos={room?.videoQueue || []}
                emptyState={
                    <div className="flex w-full flex-col items-center">
                        {autoPlayCandidate ? (
                            <div className="mt-3 w-full rounded-lg border border-dashed border-border px-2 pt-2">
                                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                                        {t('autoPlayBadge')}
                                    </span>
                                    <span className="truncate">{t('autoPlayCaption')}</span>
                                </div>
                                <VideoListItem
                                    video={autoPlayCandidate}
                                    viewsLabel={tSearch('views')}
                                    interactive={false}
                                />
                            </div>
                        ) : null}
                        <VideoListEmptyState
                            icon={<ListVideo className="h-7 w-7 text-muted-foreground" />}
                            title={t('noVideos')}
                            description={t('noVideosHint')}
                            density={autoPlayCandidate ? 'compact' : 'default'}
                            actions={[
                                {
                                    label: t('searchCta'),
                                    icon: <Search />,
                                    onClick: () => setCurrentTab('search'),
                                },
                            ]}
                            className="flex-none"
                        />
                        {!hideYoutubeOnlyActions ? (
                            <CuratedPlaylistsPanel variant="compact" showHeading />
                        ) : null}
                    </div>
                }
                renderActions={renderActions}
            />
        </div>
    );
}
