import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: ['@vkara/shared-types'],
    output: 'standalone',
    async headers() {
        return [
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/javascript; charset=utf-8',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
            {
                source: '/manifest.webmanifest',
                headers: [
                    {
                        key: 'Content-Type',
                        value: 'application/manifest+json',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            // Fallback when middleware is not applied: serve vi at `/` without changing the URL.
            { source: '/', destination: '/vi' },
        ];
    },
};

export default nextConfig;
