import '../globals.css';

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ThemeProvider } from '@/providers/theme-provider';
import { WebSocketProvider } from '@/providers/websocket-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { ReactNode } from 'react';

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
                        <WebSocketProvider>{children}</WebSocketProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
