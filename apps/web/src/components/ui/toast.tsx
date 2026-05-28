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
            'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
            className,
        )}
        {...props}
    />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
    'group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
    {
        variants: {
            variant: {
                default:
                    'border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 [&>svg]:text-gray-600 dark:[&>svg]:text-gray-400',
                destructive:
                    'border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/95 text-red-900 dark:text-red-100 [&>svg]:text-red-600 dark:[&>svg]:text-red-400',
                success:
                    'border-green-200 bg-green-100 dark:border-green-800 dark:bg-green-900/95 text-green-900 dark:text-green-100 [&>svg]:text-green-600 dark:[&>svg]:text-green-400',
                warning:
                    'border-yellow-200 bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/95 text-yellow-900 dark:text-yellow-100 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400',
                info: 'border-blue-200 bg-blue-100 dark:border-blue-800 dark:bg-blue-900/95 text-blue-900 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400',
                error: 'border-red-200 bg-red-100 dark:border-red-800 dark:bg-red-900/95 text-red-900 dark:text-red-100 [&>svg]:text-red-600 dark:[&>svg]:text-red-400',
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
        default: <Bell className="h-5 w-5" />,
        destructive: <XCircle className="h-5 w-5" />,
        success: <CheckCircle2 className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
    }[variant || 'default'];

    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <div className="flex-1">{children}</div>
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
            'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
            'group-[.default]:border-gray-300 group-[.default]:hover:border-gray-400 group-[.default]:hover:bg-gray-100 dark:group-[.default]:hover:bg-gray-900',
            'group-[.destructive]:border-red-300 group-[.destructive]:hover:border-red-400 group-[.destructive]:hover:bg-red-100 dark:group-[.destructive]:hover:bg-red-900',
            'group-[.success]:border-green-300 group-[.success]:hover:border-green-400 group-[.success]:hover:bg-green-100 dark:group-[.success]:hover:bg-green-900',
            'group-[.warning]:border-yellow-300 group-[.warning]:hover:border-yellow-400 group-[.warning]:hover:bg-yellow-100 dark:group-[.warning]:hover:bg-yellow-900',
            'group-[.info]:border-blue-300 group-[.info]:hover:border-blue-400 group-[.info]:hover:bg-blue-100 dark:group-[.info]:hover:bg-blue-900',
            'group-[.error]:border-red-300 group-[.error]:hover:border-red-400 group-[.error]:hover:bg-red-100 dark:group-[.error]:hover:bg-red-900',
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
            'absolute right-1 top-1 rounded-md p-1 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100',
            'group-[.default]:text-gray-700/50 group-[.default]:hover:text-gray-700',
            'group-[.destructive]:text-red-700/50 group-[.destructive]:hover:text-red-700',
            'group-[.success]:text-green-700/50 group-[.success]:hover:text-green-700',
            'group-[.warning]:text-yellow-700/50 group-[.warning]:hover:text-yellow-700',
            'group-[.info]:text-blue-700/50 group-[.info]:hover:text-blue-700',
            'group-[.error]:text-red-700/50 group-[.error]:hover:text-red-700',
            className,
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
    React.ComponentRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn('text-sm font-semibold [&+div]:text-xs', className)}
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
        className={cn('text-sm opacity-[0.80]', className)}
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
