'use client';

import { useEffect, useState } from 'react';

/**
 * Turns on after `active` has been true for `delayMs`. Turns off immediately when `active` is false.
 */
export function useDeferredActive(active: boolean, delayMs: number): boolean {
    const [deferredActive, setDeferredActive] = useState(false);

    useEffect(() => {
        if (!active) {
            setDeferredActive(false);
            return;
        }

        const timer = window.setTimeout(() => setDeferredActive(true), delayMs);
        return () => window.clearTimeout(timer);
    }, [active, delayMs]);

    return deferredActive;
}
