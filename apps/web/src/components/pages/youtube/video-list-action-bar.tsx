'use client';

import { useState, type ReactNode } from 'react';

import { useI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export type VideoListAction = {
    id: string;
    label: string;
    buttonText?: string;
    icon: ReactNode;
    onClick: () => void;
    tone?: 'default' | 'outline' | 'success' | 'priority' | 'destructive';
    confirmMode?: boolean;
    confirmContent?: ReactNode;
};

type VideoListActionBarProps = {
    actions: VideoListAction[];
    className?: string;
};

const toneClasses = {
    default:
        'border-border/60 bg-secondary/60 text-foreground hover:bg-secondary/90 active:bg-secondary',
    outline:
        'border-border/70 bg-background/80 text-foreground hover:bg-accent/50 active:bg-accent/70',
    success:
        'border-emerald-500/55 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 active:bg-emerald-500/35 dark:text-emerald-300',
    priority:
        'border-amber-500/55 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 active:bg-amber-500/35 dark:text-amber-200',
    destructive:
        'border-destructive/70 bg-destructive/25 text-destructive hover:bg-destructive/35 active:bg-destructive/40',
} as const;

function ActionChip({
    label,
    buttonText,
    icon,
    tone = 'default',
    confirmMode,
    confirmContent,
    onClick,
}: Omit<VideoListAction, 'id'>) {
    const t = useI18n();
    const [open, setOpen] = useState(false);

    const face = buttonText ?? label;

    const chipButton = (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                if (!confirmMode) onClick();
            }}
            className={cn(
                'flex h-9 min-h-9 w-full min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5',
                'text-[11px] font-medium leading-none transition-colors sm:text-xs',
                'touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                toneClasses[tone],
            )}
        >
            <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5 sm:[&_svg]:h-4 sm:[&_svg]:w-4">
                {icon}
            </span>
            <span className="truncate">{face}</span>
        </button>
    );

    if (confirmMode) {
        return (
            <div className="min-w-0 w-full">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>{chipButton}</PopoverTrigger>
                    <PopoverContent className="w-auto max-w-[min(100vw-2rem,20rem)] p-0" side="top">
                        <div className="grid gap-3 p-3">
                            <div className="text-sm">{confirmContent}</div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOpen(false)}
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        setOpen(false);
                                        onClick();
                                    }}
                                >
                                    {t('confirm')}
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        );
    }

    return <div className="min-w-0 w-full">{chipButton}</div>;
}

/** Compact action chips in the metadata column — not full-screen bars. */
export function VideoListActionBar({ actions, className }: VideoListActionBarProps) {
    if (actions.length === 0) return null;

    const isPair = actions.length === 2;
    const isTriple = actions.length === 3;

    return (
        <div
            className={cn(
                'w-full min-w-0 gap-1.5',
                isPair && 'grid grid-cols-2',
                isTriple && 'grid grid-cols-3',
                !isPair &&
                    !isTriple &&
                    actions.length > 1 &&
                    'flex overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                className,
            )}
            role="group"
        >
            {actions.map((action) => (
                <div
                    key={action.id}
                    className={cn(
                        isPair || isTriple ? 'min-w-0' : 'min-w-[4.75rem] shrink-0 flex-1 basis-0',
                    )}
                >
                    <ActionChip {...action} />
                </div>
            ))}
        </div>
    );
}
