import type { NextConfig } from 'next';
import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    transpilePackages: [
        '@vkara/env',
        '@vkara/validators',
        '@vkara/youtube',
        '@vkara/room',
        '@vkara/personalization',
        '@vkara/curated-playlists',
    ],
    // Expose Vercel system env to the browser bundle so Sentry can tag
    // `production` on vkara.vercel.app without a manual NEXT_PUBLIC_SENTRY_ENVIRONMENT.
    env: {
        NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '',
        NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL ?? '',
    },
    output: 'standalone',
    // Trace deps from monorepo root — avoids bloated standalone node_modules.
    outputFileTracingRoot: path.join(__dirname, '../..'),
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'framer-motion',
            '@noriginmedia/norigin-spatial-navigation-react',
            '@noriginmedia/norigin-spatial-navigation-core',
        ],
    },
    async headers() {
        return [
            // Smart TV clients cache the /tv HTML in the app's private browser
            // profile and old engines don't reliably revalidate, leaving the
            // TV on a stale deploy until the app is reinstalled. The document
            // is tiny — never let clients store it. Hashed /_next/static
            // assets are immutable and unaffected.
            ...['/tv', '/:locale/tv'].map((source) => ({
                source,
                headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
            })),
        ];
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

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
    org: process.env.SENTRY_ORG ?? 'vkara',
    project: process.env.SENTRY_PROJECT ?? 'vkara-web',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    // Proxy browser events through Next to reduce ad-blocker drops.
    tunnelRoute: '/monitoring',
    silent: !process.env.CI,
    // Delete uploaded maps from `.next` so they are never served publicly.
    sourcemaps: {
        deleteSourcemapsAfterUpload: true,
    },
    // Annotate DOM with React component names for Replay / breadcrumbs search.
    webpack: {
        reactComponentAnnotation: {
            enabled: true,
        },
    },
});
