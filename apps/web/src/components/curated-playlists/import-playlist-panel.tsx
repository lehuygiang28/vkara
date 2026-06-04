'use client';

import { useCallback, useState } from 'react';
import { Link2, ListMusic } from 'lucide-react';
import { parseYoutubePlaylistInput } from '@vkara/shared-utils';

import {
    RemotePanelOverlayHeader,
    RemotePanelOverlayShell,
} from '@/components/pages/youtube/remote-panel-overlay-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScopedI18n } from '@/locales/client';
import { useCuratedStore } from '@/store/curatedStore';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';

import { CuratedPlaylistsPanel } from './curated-playlists-panel';

type ImportPlaylistPanelProps = {
    open: boolean;
};

export function ImportPlaylistPanel({ open }: ImportPlaylistPanelProps) {
    const tQueue = useScopedI18n('videoQueue');
    const tCurated = useScopedI18n('curatedPlaylists');
    const { handleImportPlaylist } = usePlayerAction();
    const setCurrentTab = useYouTubeStore((state) => state.setCurrentTab);
    const setImportPlaylistPanelOpen = useCuratedStore((state) => state.setImportPlaylistPanelOpen);
    const openCuratedPreview = useCuratedStore((state) => state.openCuratedPreview);

    const [urlValue, setUrlValue] = useState('');
    const [urlError, setUrlError] = useState<string | null>(null);

    const handleClose = useCallback(() => {
        setUrlError(null);
        setImportPlaylistPanelOpen(false);
    }, [setImportPlaylistPanelOpen]);

    const submitImport = useCallback(
        (raw: string) => {
            const trimmed = raw.trim();
            if (!trimmed) {
                setUrlError(tQueue('importPlaylistPlaceholder'));
                return;
            }

            try {
                parseYoutubePlaylistInput(trimmed);
            } catch {
                setUrlError(tCurated('invalidPlaylistUrl'));
                return;
            }

            setUrlError(null);
            handleImportPlaylist(trimmed);
            setUrlValue('');
            handleClose();
            setCurrentTab('queue');
        },
        [handleClose, handleImportPlaylist, setCurrentTab, tCurated, tQueue],
    );

    const handleImportFromField = useCallback(() => {
        submitImport(urlValue);
    }, [submitImport, urlValue]);

    const handlePlaylistOpen = useCallback(
        (listId: string) => {
            openCuratedPreview(listId, { returnTo: 'import' });
        },
        [openCuratedPreview],
    );

    return (
        <RemotePanelOverlayShell
            active={open}
            ariaLabel={tQueue('importPlaylist')}
            header={
                <RemotePanelOverlayHeader
                    onCloseAction={handleClose}
                    title={tQueue('importPlaylist')}
                    description={tQueue('importPlaylistDescription')}
                />
            }
        >
            <section className="space-y-3 border-b border-border/60 py-4">
                <label htmlFor="import-playlist-url" className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                    {tCurated('pastePlaylistLink')}
                </label>
                <Input
                    id="import-playlist-url"
                    value={urlValue}
                    onChange={(e) => {
                        setUrlValue(e.target.value);
                        if (urlError) {
                            setUrlError(null);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleImportFromField();
                        }
                    }}
                    placeholder={tQueue('importPlaylistPlaceholder')}
                    className="h-11"
                    autoComplete="off"
                />
                {urlError ? (
                    <p className="text-xs text-destructive" role="alert">
                        {urlError}
                    </p>
                ) : null}
                <Button
                    type="button"
                    className="min-h-11 w-full"
                    onClick={handleImportFromField}
                    disabled={!urlValue.trim()}
                >
                    <ListMusic className="h-4 w-4" />
                    {tCurated('importFromUrl')}
                </Button>
            </section>

            <CuratedPlaylistsPanel
                variant="import"
                showHeading
                onPlaylistOpenAction={handlePlaylistOpen}
            />
        </RemotePanelOverlayShell>
    );
}
