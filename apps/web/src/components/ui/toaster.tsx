'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { cn } from '@/lib/utils';

const toastOffset = {
    top: 'var(--vkara-toast-top)',
    left: 'max(var(--safe-left), 0.75rem)',
    right: 'max(var(--safe-right), 0.75rem)',
} as const;

export function Toaster({ ...props }: ToasterProps) {
    const { resolvedTheme } = useTheme();

    return (
        <Sonner
            theme={(resolvedTheme ?? 'system') as ToasterProps['theme']}
            position="top-center"
            visibleToasts={1}
            closeButton
            offset={toastOffset}
            mobileOffset={toastOffset}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: cn(
                        'group toast w-full max-w-[22rem] rounded-xl border border-border/80',
                        'bg-background/95 text-foreground shadow-lg backdrop-blur-md',
                        'supports-[backdrop-filter]:bg-background/80',
                    ),
                    title: 'text-sm font-medium leading-snug',
                    description: 'text-xs leading-relaxed text-muted-foreground',
                    closeButton:
                        'border-border/80 bg-background/90 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    success: '[&_[data-title]]:text-foreground',
                    error: '[&_[data-title]]:text-foreground',
                    info: '[&_[data-title]]:text-foreground',
                    warning: '[&_[data-title]]:text-foreground',
                },
            }}
            {...props}
        />
    );
}
