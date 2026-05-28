'use client';

import { useEffect } from 'react';

function cacheAppShell(registration: ServiceWorkerRegistration) {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
    worker?.postMessage({
        type: 'CACHE_SHELL',
        urls: ['/', '/vi', '/en'],
    });
}

/** Registers the service worker only — no install UI. */
export function PwaRegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        let cancelled = false;

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none',
                });
                await navigator.serviceWorker.ready;
                if (cancelled) return;

                cacheAppShell(registration);

                if (document.readyState === 'complete') {
                    cacheAppShell(registration);
                } else {
                    window.addEventListener(
                        'load',
                        () => cacheAppShell(registration),
                        { once: true },
                    );
                }
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        };

        void register();

        return () => {
            cancelled = true;
        };
    }, []);

    return null;
}
