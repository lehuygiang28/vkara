import { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import '@/app/tv-tokens.css';

export const metadata: Metadata = {
    title: 'vkara TV',
    description: 'Smart TV display for vkara karaoke rooms',
    robots: { index: false, follow: false },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#0f0f0f',
};

export default function TvLayout({ children }: { children: ReactNode }) {
    return (
        <div className="dark h-full min-h-dvh-screen bg-[#0f0f0f] text-white" data-tv-route>
            {children}
        </div>
    );
}
