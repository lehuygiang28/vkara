import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/locales/client';

export interface TooltipButtonProps extends ButtonProps {
    tooltipContent: React.ReactNode;
    buttonText: string;
    icon?: React.ReactNode;
    /** Square icon-only control (label kept for accessibility via aria-label). */
    iconOnly?: boolean;
    confirmMode?: boolean;
    confirmContent?: React.ReactNode;
    onConfirm: () => void;
}

/**
 * A button component that displays a tooltip with a confirmation prompt when clicked.
 * If confirmMode is set to true, a popover with the confirmContent will be displayed
 * instead of the tooltip, and the onConfirm callback will only be called when the
 * user clicks the confirm button. If confirmMode is set to false (default), the
 * tooltip will be displayed and the onConfirm callback will be called immediately
 * when the button is clicked.
 *
 * @param {React.ReactNode} tooltipContent - The content of the tooltip
 * @param {string} buttonText - The text of the button
 * @param {React.ReactNode} icon - The icon of the button
 * @param {boolean} confirmMode - If true, a confirmation prompt will be displayed
 * @param {React.ReactNode} confirmContent - The content of the confirmation prompt
 * @param {() => void} onConfirm - The callback to be called when the button is clicked
 * @param {Object} buttonProps - Additional props to be passed to the button component
 */
export function TooltipButton({
    tooltipContent,
    buttonText,
    icon,
    iconOnly = false,
    confirmMode = false,
    confirmContent,
    onConfirm,
    className,
    variant = 'secondary',
    ...buttonProps
}: TooltipButtonProps) {
    const t = useI18n();
    const [open, setOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirmMode) {
            onConfirm();
        }
    };

    const handleConfirm = () => {
        setOpen(false);
        onConfirm();
    };

    const button = (
        <Button
            variant={variant}
            size={iconOnly ? 'icon' : 'sm'}
            aria-label={buttonText}
            className={cn(
                'h-9 min-h-9 shrink-0 rounded-lg border text-xs font-medium shadow-none transition-colors active:scale-[0.98]',
                iconOnly ? 'w-9 gap-0 px-0' : 'gap-1 px-2.5',
                variant === 'destructive' &&
                    'border-destructive/70 bg-destructive/25 text-destructive hover:bg-destructive/35',
                variant === 'secondary' && 'border-border/60 bg-secondary/60 hover:bg-secondary/90',
                variant === 'outline' && 'border-border/70 bg-background/80 hover:bg-accent/50',
                className,
            )}
            onClick={handleClick}
            {...buttonProps}
        >
            {icon ? <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
            {iconOnly ? (
                <span className="sr-only">{buttonText}</span>
            ) : (
                <span className="min-w-0 truncate leading-tight">{buttonText}</span>
            )}
        </Button>
    );

    return (
        <div className={cn(iconOnly ? 'shrink-0' : 'min-w-0')}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {confirmMode ? (
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>{button}</PopoverTrigger>
                            <PopoverContent className="w-auto max-w-96 p-0">
                                <div className="grid gap-4 p-4">
                                    <div className="space-y-2">{confirmContent}</div>
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setOpen(false)}
                                        >
                                            {t('cancel')}
                                        </Button>
                                        <Button size="sm" onClick={handleConfirm}>
                                            {t('confirm')}
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        button
                    )}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
