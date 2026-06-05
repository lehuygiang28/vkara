'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    type ReactNode,
    type RefObject,
} from 'react';

type RemotePanelOverlayContextValue = {
    overlayRootRef: RefObject<HTMLDivElement | null>;
    containOverlays: boolean;
};

const RemotePanelOverlayContext = createContext<RemotePanelOverlayContextValue | null>(null);

type RemotePanelOverlayProviderProps = {
    containOverlays: boolean;
    children: ReactNode;
};

/** Scopes search/voice overlays to the remote column on laptop & TV slide-out panel. */
export function RemotePanelOverlayProvider({
    containOverlays,
    children,
}: RemotePanelOverlayProviderProps) {
    const overlayRootRef = useRef<HTMLDivElement>(null);
    const value = useMemo(() => ({ overlayRootRef, containOverlays }), [containOverlays]);

    return (
        <RemotePanelOverlayContext.Provider value={value}>
            <div
                ref={overlayRootRef}
                className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            >
                {children}
            </div>
        </RemotePanelOverlayContext.Provider>
    );
}

function useRemotePanelOverlayContext() {
    return useContext(RemotePanelOverlayContext);
}

/** Portal target + positioning for search/voice overlays. */
export function useOverlayPortal(active: boolean) {
    const ctx = useRemotePanelOverlayContext();
    const containOverlays = ctx?.containOverlays ?? false;
    const overlayRootRef = ctx?.overlayRootRef;

    const portalTarget = !active
        ? null
        : containOverlays
          ? (overlayRootRef?.current ?? null)
          : typeof document !== 'undefined'
            ? document.body
            : null;

    useEffect(() => {
        if (!active) {
            return;
        }

        if (containOverlays && overlayRootRef?.current) {
            const root = overlayRootRef.current;
            const previousOverflow = root.style.overflow;
            root.style.overflow = 'hidden';
            return () => {
                root.style.overflow = previousOverflow;
            };
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [active, containOverlays, overlayRootRef]);

    return {
        portalTarget,
        positionClass: containOverlays ? ('absolute' as const) : ('fixed' as const),
        containOverlays,
    };
}
