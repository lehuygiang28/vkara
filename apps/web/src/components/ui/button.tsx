import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
                outline:
                    'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
                secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
                ghost: 'hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
                success: 'bg-green-500 text-white shadow hover:bg-green-600',
                warning: 'bg-yellow-500 text-white shadow hover:bg-yellow-600',
                info: 'bg-blue-500 text-white shadow hover:bg-blue-600',
                glow: 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.65)]',
                scan: 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg hover:from-violet-600 hover:to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
            },
            size: {
                default: 'h-9 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-10 rounded-md px-8',
                icon: 'h-9 w-9',
            },
            rounded: {
                default: 'rounded-md',
                full: 'rounded-full',
            },
            block: {
                true: 'w-full',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
            rounded: 'default',
        },
    },
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    block?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            rounded,
            asChild = false,
            loading = false,
            block,
            children,
            ...props
        },
        ref,
    ) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, rounded, block, className }))}
                ref={ref}
                disabled={props.disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {typeof children === 'string' ? 'Loading...' : children}
                    </>
                ) : (
                    children
                )}
            </Comp>
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
