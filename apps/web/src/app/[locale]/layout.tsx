import '../globals.css';

import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@next/third-parties/google';
import Locale from 'intl-locale-textinfo-polyfill';

import { ThemeProvider } from '@/providers/theme-provider';
import { WebSocketProvider } from '@/providers/websocket-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { Toaster } from '@/components/ui/toaster';
import { PwaRegister } from '@/components/pwa-register';
import { getSiteUrl } from '@/lib/site-url';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    metadataBase: getSiteUrl(),
    title: 'vkara - Hát cùng nhau nàooooo',
    description:
        'vkara là ứng dụng hát karaoke trực tuyến, giúp bạn hát cùng nhau mọi lúc mọi nơi.',
    applicationName: 'vkara',
    manifest: '/manifest.webmanifest',
    icons: {
        icon: [
            { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
            { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'vkara',
    },
    formatDetection: {
        telephone: false,
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#fafafa' },
        { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    ],
};

export default async function RootLayout({
    params,
    children,
}: {
    params: Promise<{ locale: string }>;
    children: ReactNode;
}) {
    const { locale } = await params;
    const { direction: dir } = new Locale(locale).textInfo;

    return (
        <html lang={locale ?? 'vi'} dir={dir} suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased cursor-auto`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <I18nProvider locale={locale ?? 'vi'}>
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
            </body>
        </html>
    );
}
