'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { useToastPlacement } from '@/hooks/use-toast-placement';
import { cn } from '@/lib/utils';

export function Toaster({ ...props }: ToasterProps) {
    const { resolvedTheme } = useTheme();
    const { position, offset, swipeDirections } = useToastPlacement();

    return (
        <Sonner
            theme={(resolvedTheme ?? 'system') as ToasterProps['theme']}
            position={position}
            visibleToasts={2}
            expand={false}
            closeButton={false}
            gap={8}
            offset={offset}
            mobileOffset={offset}
            swipeDirections={[...swipeDirections]}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: cn(
                        'group toast w-[calc(100vw-max(var(--safe-left),0.75rem)-max(var(--safe-right),0.75rem))]',
                        'max-w-[min(100%,22rem)] rounded-lg border border-border/70',
                        'bg-background/96 text-foreground shadow-[0_8px_32px_rgb(0_0_0_0.12)]',
                        'backdrop-blur-md supports-[backdrop-filter]:bg-background/88',
                        'touch-manipulation select-none',
                    ),
                    title: 'text-[13px] font-medium leading-snug sm:text-sm',
                    description: 'text-xs leading-relaxed text-muted-foreground line-clamp-2',
                    closeButton:
                        'border-border/70 bg-background/95 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
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
