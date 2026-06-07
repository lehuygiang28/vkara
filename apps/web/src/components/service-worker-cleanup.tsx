'use client';

import { useEffect } from 'react';

/** Unregister legacy vkara service workers and drop old PWA caches (one-time per visit). */
export function ServiceWorkerCleanup() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        void (async () => {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));

            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(
                    keys.filter((key) => key.startsWith('vkara-')).map((key) => caches.delete(key)),
                );
            }
        })();
    }, []);

    return null;
}
