'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/lib/utils';

/** Critical errors only — success/info/warning use ActionFeedbackHost in layout. */
export function Toaster({ ...props }: ToasterProps) {
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={(resolvedTheme ?? 'dark') as ToasterProps['theme']}
            position="top-center"
            visibleToasts={2}
            expand={false}
            closeButton
            richColors={false}
            gap={8}
            offset={{
                top: 'var(--vkara-toast-top)',
                left: 'max(var(--safe-left), 0.75rem)',
                right: 'max(var(--safe-right), 0.75rem)',
            }}
            mobileOffset={{
                top: 'var(--vkara-toast-top)',
                left: 'max(var(--safe-left), 0.75rem)',
                right: 'max(var(--safe-right), 0.75rem)',
            }}
            swipeDirections={['left', 'right', 'top']}
            className="vkara-system-toaster z-[100]"
            toastOptions={{
                classNames: {
                    toast: cn(
                        'w-[min(22rem,calc(100vw-max(var(--safe-left),0.75rem)-max(var(--safe-right),0.75rem)))]',
                        'rounded-xl border-2 border-zinc-600 bg-zinc-900 text-zinc-50',
                        'shadow-[0_12px_40px_rgb(0_0_0/0.7)]',
                    ),
                    title: 'text-sm font-semibold leading-snug',
                    description: 'text-xs text-zinc-400 leading-snug',
                    closeButton:
                        'border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white',
                },
            }}
            {...props}
        />
    );
}
