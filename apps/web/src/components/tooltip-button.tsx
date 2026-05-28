import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, ButtonProps } from '@/components/ui/button';
import { useI18n } from '@/locales/client';

export interface TooltipButtonProps extends ButtonProps {
    tooltipContent: React.ReactNode;
    buttonText: string;
    icon?: React.ReactNode;
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
    confirmMode = false,
    confirmContent,
    onConfirm,
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
            variant="secondary"
            size="sm"
            className="h-7 px-2.5 transition-all hover:scale-105"
            onClick={handleClick}
            {...buttonProps}
        >
            {icon && <span>{icon}</span>}
            <span>{buttonText}</span>
        </Button>
    );

    return (
        <TooltipProvider>
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
        </TooltipProvider>
    );
}
