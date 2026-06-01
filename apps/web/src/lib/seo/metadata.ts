import type { Metadata } from 'next';

import {
    APP_LOCALES,
    DEFAULT_APP_LOCALE,
    getLocalePublicPath,
    type AppLocale,
} from '@/lib/locale-path';
import { getSiteUrl } from '@/lib/site-url';

export type SeoTranslations = {
    title: string;
    description: string;
    keywords: string;
    siteName: string;
    ogImageAlt: string;
};

function buildLanguageAlternates(): Record<string, string> {
    const languages: Record<string, string> = {
        'x-default': getLocalePublicPath(DEFAULT_APP_LOCALE),
    };

    for (const locale of APP_LOCALES) {
        languages[locale] = getLocalePublicPath(locale);
    }

    return languages;
}

export function buildPageMetadata(locale: AppLocale, t: SeoTranslations): Metadata {
    const canonicalPath = getLocalePublicPath(locale);
    const keywords = t.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean);

    return {
        metadataBase: getSiteUrl(),
        title: {
            default: t.title,
            template: `%s | ${t.siteName}`,
        },
        description: t.description,
        keywords,
        applicationName: t.siteName,
        icons: {
            icon: [
                { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
                { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
            apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
        },
        formatDetection: {
            telephone: false,
        },
        alternates: {
            canonical: canonicalPath,
            languages: buildLanguageAlternates(),
        },
        openGraph: {
            type: 'website',
            locale: locale === 'vi' ? 'vi_VN' : 'en_US',
            alternateLocale: locale === 'vi' ? ['en_US'] : ['vi_VN'],
            url: canonicalPath,
            title: t.title,
            description: t.description,
            siteName: t.siteName,
            images: [
                {
                    url: '/og-image.png',
                    width: 1200,
                    height: 630,
                    alt: t.ogImageAlt,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: t.title,
            description: t.description,
            images: ['/og-image.png'],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
            : {}),
    };
}
