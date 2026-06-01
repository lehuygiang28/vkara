import '../globals.css';

import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { CloudflareWebAnalytics } from '@/components/analytics/cloudflare-web-analytics';
import Locale from 'intl-locale-textinfo-polyfill';

import { ThemeProvider } from '@/providers/theme-provider';
import { WebSocketProvider } from '@/providers/websocket-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { Toaster } from '@/components/ui/toaster';
import { PwaRegister } from '@/components/pwa-register';
import { JsonLd } from '@/components/seo/json-ld';
import { isAppLocale, type AppLocale } from '@/lib/locale-path';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { getI18n, getStaticParams, setStaticParamsLocale } from '@/locales/server';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        notFound();
    }
    setStaticParamsLocale(locale);
    const t = await getI18n();

    return buildPageMetadata(locale, {
        title: t('seo.title'),
        description: t('seo.description'),
        keywords: t('seo.keywords'),
        siteName: t('seo.siteName'),
        ogImageAlt: t('seo.ogImageAlt'),
    });
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#fafafa' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    ],
};

export function generateStaticParams() {
    return getStaticParams();
}

export default async function RootLayout({
    params,
    children,
}: {
    params: Promise<{ locale: string }>;
    children: ReactNode;
}) {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        notFound();
    }
    const appLocale: AppLocale = locale;
    setStaticParamsLocale(appLocale);
    const { direction: dir } = new Locale(appLocale).textInfo;
    const t = await getI18n();

    return (
        <html lang={appLocale} dir={dir} suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased cursor-auto`}>
                <JsonLd
                    locale={appLocale}
                    title={t('seo.title')}
                    description={t('seo.description')}
                    siteName={t('seo.siteName')}
                />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <I18nProvider locale={appLocale}>
                        <WebSocketProvider>
                            <PwaRegister />
                            {children}
                            <Toaster />
                        </WebSocketProvider>
                    </I18nProvider>
                </ThemeProvider>
                <Analytics />
                {process.env?.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
                    <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
                )}
                <CloudflareWebAnalytics />
            </body>
        </html>
    );
}
