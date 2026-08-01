'use client';

import { useEffect } from 'react';

/**
 * Scopes TV root rem density to the mounted `/tv` tree.
 * CSS targets `html.tv-root-scale` (see tv-root-scale.css) so client
 * navigations away from `/tv` restore normal site rem without `:has()`.
 */
export function TvRootScale() {
    useEffect(() => {
        const html = document.documentElement;
        html.classList.add('tv-root-scale');
        return () => {
            html.classList.remove('tv-root-scale');
        };
    }, []);

    return null;
}
