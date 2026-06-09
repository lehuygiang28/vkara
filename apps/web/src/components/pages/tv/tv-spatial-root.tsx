'use client';

import { ReactNode, useEffect } from 'react';
import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';

import { ensureTvSpatialNavInit, TV_APP_ROOT_KEY, TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';

export { TV_APP_ROOT_KEY };

if (typeof window !== 'undefined') {
    ensureTvSpatialNavInit();
}

type TvSpatialRootProps = {
    children: ReactNode;
};

function TvSpatialRootInner({ children }: TvSpatialRootProps) {
    const { ref, focusKey } = useFocusable({
        focusKey: TV_FOCUS_KEYS.appRoot,
        trackChildren: true,
        saveLastFocusedChild: true,
        focusable: false,
    });

    return (
        <FocusContext.Provider value={focusKey}>
            <div ref={ref} className="h-full w-full outline-none">
                {children}
            </div>
        </FocusContext.Provider>
    );
}

export function TvSpatialRoot({ children }: TvSpatialRootProps) {
    useEffect(() => {
        ensureTvSpatialNavInit();
    }, []);

    return <TvSpatialRootInner>{children}</TvSpatialRootInner>;
}
