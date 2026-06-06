'use client';

import * as ReactDOM from 'react-dom';
import type { ReactNode } from 'react';

import { SearchHeaderBackButton } from '@/components/search/search-header';
import { REMOTE_CHROME_Z_INDEX } from '@/lib/remote-chrome';
import { cn } from '@/lib/utils';

import { RemotePageGutter, RemoteScrollRoot } from './remote-chrome';
import { useOverlayPortal } from './remote-panel-overlay-root';

export type RemotePanelOverlayBodyMode = 'scroll' | 'list';

type RemotePanelOverlayShellProps = {
    active: boolean;
    ariaLabel: string;
    header: ReactNode;
    children: ReactNode;
    /** `list` — flex column for {@link VideoList} (internal scroll). `scroll` — outer scroll container. */
    bodyMode?: RemotePanelOverlayBodyMode;
};

/** Overlay scoped above bottom nav / now playing — same layout contract as queue/search tabs. */
export function RemotePanelOverlayShell({
    active,
    ariaLabel,
    header,
    children,
    bodyMode = 'scroll',
}: RemotePanelOverlayShellProps) {
    const { portalTarget, positionClass } = useOverlayPortal(active);

    if (!active || !portalTarget) {
        return null;
    }

    return ReactDOM.createPortal(
        <div
            className={cn(positionClass, 'inset-0 flex flex-col bg-background')}
            style={{ zIndex: REMOTE_CHROME_Z_INDEX.panelOverlay }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            {header}
            {bodyMode === 'list' ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            ) : (
                <RemoteScrollRoot className="min-h-0 flex-1">
                    <RemotePageGutter className="min-h-min">{children}</RemotePageGutter>
                </RemoteScrollRoot>
            )}
        </div>,
        portalTarget,
    );
}

type RemotePanelOverlayHeaderProps = {
    onCloseAction: () => void;
    title: ReactNode;
    description?: ReactNode;
    trailing?: ReactNode;
};

export function RemotePanelOverlayHeader({
    onCloseAction,
    title,
    description,
    trailing,
}: RemotePanelOverlayHeaderProps) {
    return (
        <header className="grid shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 border-b px-page-gutter py-3">
            <SearchHeaderBackButton onClickAction={onCloseAction} />
            <div className="min-w-0">
                <div className="truncate text-base font-semibold tracking-tight">{title}</div>
                {description ? (
                    <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {trailing}
        </header>
    );
}
