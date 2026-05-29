import { APP_LOCALES, getLocalePublicPath, type AppLocale } from '@/lib/locale-path';
import { getSiteUrl } from '@/lib/site-url';

type StructuredDataInput = {
    locale: AppLocale;
    title: string;
    description: string;
    siteName: string;
};

export function buildStructuredData({ locale, title, description, siteName }: StructuredDataInput) {
    const siteUrl = getSiteUrl().origin;
    const pageUrl = `${siteUrl}${getLocalePublicPath(locale)}`;

    const webApplication = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: siteName,
        headline: title,
        description,
        url: pageUrl,
        inLanguage: locale === 'vi' ? 'vi-VN' : 'en-US',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        image: `${siteUrl}/og-image.png`,
    };

    const webSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        description,
        url: siteUrl,
        inLanguage: APP_LOCALES.map((appLocale) => (appLocale === 'vi' ? 'vi-VN' : 'en-US')),
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${pageUrl}?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };

    return [webApplication, webSite];
}
