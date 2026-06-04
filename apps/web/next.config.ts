import type { NextConfig } from 'next';
import path from 'node:path';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    transpilePackages: ['@vkara/youtube', '@vkara/room', '@vkara/personalization', '@vkara/curated-playlists'],
    output: 'standalone',
    // Trace deps from monorepo root — avoids bloated standalone node_modules.
    outputFileTracingRoot: path.join(__dirname, '../..'),
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion'],
    },
    async redirects() {
        return [
            // iOS Safari requests these at the site root (bypasses i18n middleware due to `.` in path).
            {
                source: '/apple-touch-icon.png',
                destination: '/icons/apple-touch-icon.png',
                permanent: false,
            },
            {
                source: '/apple-touch-icon-precomposed.png',
                destination: '/icons/apple-touch-icon.png',
                permanent: false,
            },
        ];
    },
};

export default withBundleAnalyzer(nextConfig);
