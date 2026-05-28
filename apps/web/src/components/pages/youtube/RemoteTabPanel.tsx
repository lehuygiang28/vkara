'use client';

import type { ReactNode } from 'react';

/** Full-height slot for remote tab content (safe insets live in each tab / list). */
export function RemoteTabPanel({ children }: { children: ReactNode }) {
    return <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
