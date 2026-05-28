import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: ['@vkara/shared-types'],
    async rewrites() {
        return [
            // Fallback for deployments where middleware isn't applied to `/`.
            // Keeps URL as `/` while serving default locale content.
            { source: '/', destination: '/vi' },
        ];
    },
};

export default nextConfig;
