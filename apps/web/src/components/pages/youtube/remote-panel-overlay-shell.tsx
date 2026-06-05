'use client';

import * as ReactDOM from 'react-dom';
import type { ReactNode } from 'react';

import { SearchHeaderBackButton } from '@/components/search/search-header';
import { cn } from '@/lib/utils';

import { RemoteScrollRoot } from './remote-chrome';
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
            className={cn(positionClass, 'inset-0 z-50 flex flex-col bg-background')}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
        >
            {header}
            {bodyMode === 'list' ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            ) : (
                <RemoteScrollRoot className="min-h-0 flex-1 px-safe-offset">{children}</RemoteScrollRoot>
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
        <header className="flex shrink-0 items-center gap-2 border-b px-safe-offset py-3">
            <SearchHeaderBackButton onClickAction={onCloseAction} />
            <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold tracking-tight">{title}</div>
                {description ? (
                    <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
            </div>
            {trailing}
        </header>
    );
}
