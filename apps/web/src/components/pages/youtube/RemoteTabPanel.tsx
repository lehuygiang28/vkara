'use client';

import type { ReactNode } from 'react';

/** Tab content column. Scroll surfaces must use `remote-chrome/RemoteScrollRoot` or `VideoList`. */
export function RemoteTabPanel({ children }: { children: ReactNode }) {
    return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
