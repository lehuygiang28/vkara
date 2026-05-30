'use client';

import { Loader2, WifiOff } from 'lucide-react';

import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type ConnectionStatusIndicatorProps = {
    variant?: 'banner' | 'tv-overlay';
    className?: string;
};

export function ConnectionStatusIndicator({
    variant = 'banner',
    className,
}: ConnectionStatusIndicatorProps) {
    const { connectionStatus } = useWebSocket();
    const t = useScopedI18n('connection');

    if (connectionStatus === 'OPEN') {
        return null;
    }

    const isConnecting = connectionStatus === 'CONNECTING';
    const label = isConnecting ? t('connecting') : t('offline');
    const icon = isConnecting ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
    ) : (
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
    );

    if (variant === 'tv-overlay') {
        return (
            <div
                role="status"
                aria-live="polite"
                className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 z-[7] flex justify-center px-4 pt-safe',
                    className,
                )}
            >
                <div
                    className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-[0_8px_32px_rgb(0_0_0_0.35)] backdrop-blur-md',
                        isConnecting
                            ? 'border-amber-400/35 bg-amber-500/15 text-amber-100'
                            : 'border-red-400/35 bg-red-500/15 text-red-100',
                    )}
                >
                    {icon}
                    <span>{label}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-center justify-center gap-2 border-b px-safe-offset py-2.5 text-center text-xs font-medium pt-safe-offset',
                isConnecting
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-destructive/30 bg-destructive/10 text-destructive-foreground',
                className,
            )}
        >
            {icon}
            <span>{label}</span>
        </div>
    );
}

/** Inline banner for remote / split layouts (pushes content). */
export function ConnectionStatusBanner() {
    return <ConnectionStatusIndicator variant="banner" />;
}
