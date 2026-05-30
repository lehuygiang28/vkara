import { Smartphone, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

type ScopeBadgeProps = {
    scope: 'device' | 'room';
    label: string;
    className?: string;
};

export function ScopeBadge({ scope, label, className }: ScopeBadgeProps) {
    const Icon = scope === 'device' ? Smartphone : Users;

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                scope === 'device'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary/10 text-primary',
                className,
            )}
        >
            <Icon className="h-3 w-3" aria-hidden />
            {label}
        </span>
    );
}
