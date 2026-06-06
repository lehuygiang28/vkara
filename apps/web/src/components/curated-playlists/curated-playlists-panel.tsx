'use client';

import { useScopedI18n } from '@/locales/client';
import { useCuratedCatalogs } from '@/hooks/use-curated-catalogs';

import { CuratedCatalogSection } from './curated-catalog-section';

type CuratedPlaylistsPanelProps = {
    variant?: 'browse' | 'compact' | 'import';
    showHeading?: boolean;
    onPlaylistOpenAction?: (listId: string) => void;
};

export function CuratedPlaylistsPanel({
    variant = 'browse',
    showHeading = true,
    onPlaylistOpenAction,
}: CuratedPlaylistsPanelProps) {
    const t = useScopedI18n('curatedPlaylists');
    const catalogs = useCuratedCatalogs();
    const isBrowse = variant === 'browse';
    const isImport = variant === 'import';

    if (catalogs.length === 0) {
        return null;
    }

    return (
        <div
            className={
                isBrowse
                    ? 'min-w-0 border-t border-border/60 pb-2 pt-4'
                    : isImport
                      ? 'py-4'
                      : 'w-full px-safe-offset'
            }
        >
            {showHeading ? (
                isImport ? (
                    <div className="mb-4 space-y-1">
                        <h3 className="text-sm font-medium text-foreground">{t('importQuickPick')}</h3>
                        <p className="text-xs text-muted-foreground">{t('importQuickPickHint')}</p>
                    </div>
                ) : (
                    <p
                        className={
                            isBrowse
                                ? 'mb-4 px-safe-offset text-sm text-muted-foreground'
                                : 'mb-3 text-center text-sm text-muted-foreground'
                        }
                    >
                        {t('sectionHint')}
                    </p>
                )
            ) : null}
            <div className={isBrowse ? 'min-w-0 space-y-6' : 'space-y-4'}>
                {catalogs.map((catalog) => (
                    <CuratedCatalogSection
                        key={catalog.id}
                        catalog={catalog}
                        horizontal={isBrowse}
                        onPlaylistOpenAction={onPlaylistOpenAction}
                    />
                ))}
            </div>
        </div>
    );
}
