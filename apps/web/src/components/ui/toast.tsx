'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            'pointer-events-none fixed z-[100] flex w-full flex-col gap-2 px-3',
            'bottom-[var(--vkara-toast-bottom)] max-h-[min(40dvh,11rem)] items-center',
            'sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-screen sm:max-w-[min(100vw-1.5rem,22rem)] sm:items-stretch sm:px-0',
            'md:right-4 md:top-4',
            className,
        )}
        {...props}
    />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
    [
        'group pointer-events-auto relative flex w-full max-w-[22rem] cursor-pointer items-start gap-2.5 overflow-hidden',
        'rounded-xl border px-3 py-2.5 pr-9 shadow-lg backdrop-blur-md',
        'transition-all active:scale-[0.98]',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out',
        'data-[state=closed]:fade-out-80',
        'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-2',
        'sm:data-[state=open]:slide-in-from-top-2 sm:data-[state=closed]:slide-out-to-right-full',
    ].join(' '),
    {
        variants: {
            variant: {
                default:
                    'border-border/80 bg-background/95 text-foreground [&>svg]:text-muted-foreground',
                destructive:
                    'border-destructive/35 bg-background/95 text-foreground [&>svg]:text-destructive',
                success:
                    'border-emerald-500/30 bg-background/95 text-foreground [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
                warning:
                    'border-amber-500/35 bg-background/95 text-foreground [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
                info: 'border-sky-500/30 bg-background/95 text-foreground [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400',
                error: 'border-destructive/35 bg-background/95 text-foreground [&>svg]:text-destructive',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const Toast = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
    const icon = {
        default: <Bell className="h-4 w-4" aria-hidden />,
        destructive: <XCircle className="h-4 w-4" aria-hidden />,
        success: <CheckCircle2 className="h-4 w-4" aria-hidden />,
        warning: <AlertCircle className="h-4 w-4" aria-hidden />,
        info: <Info className="h-4 w-4" aria-hidden />,
        error: <XCircle className="h-4 w-4" aria-hidden />,
    }[variant || 'default'];

    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
        >
            {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
            <div className="min-w-0 flex-1">{children}</div>
        </ToastPrimitives.Root>
    );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            'inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-2 text-xs font-medium transition-colors hover:bg-accent focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            'absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity hover:bg-accent/60 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring',
            className,
        )}
        toast-close=""
        {...props}
    >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Close</span>
    </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn('text-sm font-medium leading-snug [&+div]:text-xs', className)}
        {...props}
    />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn('text-xs leading-relaxed text-muted-foreground', className)}
        {...props}
    />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
};
