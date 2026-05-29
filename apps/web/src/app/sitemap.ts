import type { MetadataRoute } from 'next';

import { APP_LOCALES, DEFAULT_APP_LOCALE, getLocalePublicPath } from '@/lib/locale-path';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = getSiteUrl().origin;
    const lastModified = new Date();

    return APP_LOCALES.map((locale) => ({
        url: `${baseUrl}${getLocalePublicPath(locale)}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: locale === DEFAULT_APP_LOCALE ? 1 : 0.9,
    }));
}
