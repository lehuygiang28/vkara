import type { MetadataRoute } from 'next';

/**
 * Relative URLs resolve against the manifest origin at runtime (works on every deploy).
 * Do not bake absolute localhost URLs here — that breaks PWA install in production.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        id: '/',
        name: 'vkara - Hát karaoke cùng nhau',
        short_name: 'vkara',
        description:
            'vkara là ứng dụng hát karaoke trực tuyến, giúp bạn hát cùng nhau mọi lúc mọi nơi.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        // Android Chrome: invite links opened outside the browser may open in this PWA.
        launch_handler: {
            client_mode: 'navigate-existing',
        },
        orientation: 'any',
        background_color: '#0a0a0f',
        theme_color: '#0a0a0f',
        lang: 'vi',
        dir: 'ltr',
        categories: ['entertainment', 'music'],
        prefer_related_applications: false,
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/icons/maskable-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
