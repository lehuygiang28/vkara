import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site-url';

function isProductionEnvironment(): boolean {
    if (process.env.VERCEL_ENV) {
        return process.env.VERCEL_ENV === 'production';
    }

    return process.env.NODE_ENV === 'production';
}

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getSiteUrl().origin;

    if (!isProductionEnvironment()) {
        return {
            rules: {
                userAgent: '*',
                disallow: '/',
            },
        };
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/_next/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
