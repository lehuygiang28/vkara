import '../globals.css';

import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { GoogleAnalytics } from '@next/third-parties/google';

import { ThemeProvider } from '@/providers/theme-provider';
import { WebSocketProvider } from '@/providers/websocket-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'vkara - Hát cùng nhau nàooooo',
    description:
        'vkara là ứng dụng hát karaoke trực tuyến, giúp bạn hát cùng nhau mọi lúc mọi nơi.',
};

export default async function RootLayout({
    params,
    children,
}: {
    params: Promise<{ locale: string }>;
    children: ReactNode;
}) {
    const { locale } = await params;

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <I18nProvider locale={locale ?? 'vi'}>
                        <WebSocketProvider>
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
