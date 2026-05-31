'use client';

import { Loader2 } from 'lucide-react';

import { useConnectionStatusUi } from '@/hooks/use-connection-status-ui';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type ConnectionStatusToastProps = {
    className?: string;
};

/**
 * Single global connection status surface — fixed overlay, debounced, same look everywhere.
 */
export function ConnectionStatusToast({ className }: ConnectionStatusToastProps) {
    const t = useScopedI18n('connection');
    const { visible, isConnecting } = useConnectionStatusUi();
    const label = isConnecting ? t('connecting') : t('offline');

    return (
        <div
            className={cn(
                'pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center pt-safe-offset',
                className,
            )}
            aria-hidden={!visible}
        >
            <div
                role="status"
                aria-live="polite"
                data-visible={visible ? 'true' : 'false'}
                className={cn(
                    'connection-status-toast inline-flex max-w-[min(100%,24rem)] items-center gap-2.5 rounded-lg border px-3.5 py-2 text-xs font-medium tabular-nums shadow-[0_4px_24px_rgb(0_0_0_0.28)] backdrop-blur-sm',
                    isConnecting
                        ? 'border-zinc-600/50 bg-zinc-900/88 text-zinc-100'
                        : 'border-zinc-700/60 bg-zinc-950/92 text-zinc-200',
                )}
            >
                <span
                    className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md',
                        isConnecting ? 'bg-zinc-800' : 'bg-zinc-800/80',
                    )}
                    aria-hidden
                >
                    {isConnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-300" />
                    ) : (
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-zinc-400 opacity-40" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-400" />
                        </span>
                    )}
                </span>
                <span className="leading-snug">{label}</span>
            </div>
        </div>
    );
}
