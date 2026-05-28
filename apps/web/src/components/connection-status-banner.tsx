'use client';

import { Loader2, WifiOff } from 'lucide-react';

import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

export function ConnectionStatusBanner() {
    const { connectionStatus } = useWebSocket();
    const t = useScopedI18n('connection');

    if (connectionStatus === 'OPEN') {
        return null;
    }

    const isConnecting = connectionStatus === 'CONNECTING';

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-center justify-center gap-2 border-b px-safe-offset py-2.5 text-center text-xs font-medium pt-safe-offset',
                isConnecting
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                    : 'border-destructive/30 bg-destructive/10 text-destructive-foreground',
            )}
        >
            {isConnecting ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
            ) : (
                <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>{isConnecting ? t('connecting') : t('offline')}</span>
        </div>
    );
}
