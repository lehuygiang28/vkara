/* vkara PWA — install-safe precache + runtime cache for UI/assets */
const PRECACHE = 'vkara-precache-v4';
const RUNTIME = 'vkara-runtime-v4';
const SHELL_PATHS = ['/vi', '/en', '/'];

const PRECACHE_URLS = [
    '/manifest.webmanifest',
    '/icons/icon-32.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/maskable-icon-512.png',
    '/icons/apple-touch-icon.png',
];

function isImmutableAsset(pathname) {
    return (
        pathname.startsWith('/_next/static/') ||
        pathname.startsWith('/icons/') ||
        pathname === '/favicon.ico'
    );
}

function isShellPath(pathname) {
    return SHELL_PATHS.includes(pathname);
}

function isSkippable(pathname) {
    return pathname.startsWith('/api');
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
        await cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const network = fetch(request).then((response) => {
        if (response.ok) {
            void cache.put(request, response.clone());
        }
        return response;
    });

    return cached ?? network;
}

async function networkFirstDocument(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        for (const path of SHELL_PATHS) {
            const fallback = await cache.match(path);
            if (fallback) return fallback;
        }
        throw new Error('offline');
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PRECACHE);
            await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            const keep = new Set([PRECACHE, RUNTIME]);
            await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'CACHE_SHELL') return;

    const work = (async () => {
        const cache = await caches.open(RUNTIME);
        const urls = Array.isArray(data.urls) ? data.urls : SHELL_PATHS;
        await Promise.allSettled(
            urls.map(async (path) => {
                const request = new Request(new URL(path, self.location.origin).href, {
                    credentials: 'same-origin',
                });
                const response = await fetch(request);
                if (response.ok) await cache.put(request, response);
            }),
        );
    })();

    if ('waitUntil' in event && typeof event.waitUntil === 'function') {
        event.waitUntil(work);
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (isSkippable(url.pathname)) return;

    const isNavigate = request.mode === 'navigate';
    const accept = request.headers.get('accept') ?? '';
    const isDocument = isNavigate || accept.includes('text/html');

    if (isImmutableAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, PRECACHE));
        return;
    }

    if (isDocument || isShellPath(url.pathname)) {
        event.respondWith(networkFirstDocument(request, RUNTIME));
        return;
    }

    if (url.pathname.startsWith('/_next/')) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME));
        return;
    }

    event.respondWith(staleWhileRevalidate(request, RUNTIME));
});
