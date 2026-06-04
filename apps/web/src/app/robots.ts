import type { MetadataRoute } from 'next';

import { env } from '@/env';
import { getSiteUrl } from '@/lib/site-url';

function isProductionEnvironment(): boolean {
    if (env.VERCEL_ENV) {
        return env.VERCEL_ENV === 'production';
    }

    return env.NODE_ENV === 'production';
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
