'use client';

import { useMemo } from 'react';

import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLayoutModeChange, type LayoutModeChoice } from '@/hooks/use-layout-mode-change';
import { useI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type LayoutModePickerProps = {
    tone?: 'default' | 'dark';
    className?: string;
    showLabel?: boolean;
    /** Short “Device mode” vs long “Using vkara on”. */
    labelStyle?: 'short' | 'long';
    showDescription?: boolean;
    id?: string;
};

const CHOICES: LayoutModeChoice[] = ['auto', 'remote', 'player', 'both'];

function layoutLabelKey(value: LayoutModeChoice) {
    switch (value) {
        case 'auto':
            return 'youtubePage.layoutAuto';
        case 'remote':
            return 'youtubePage.layoutRemote';
        case 'player':
            return 'youtubePage.layoutPlayer';
        case 'both':
            return 'youtubePage.layoutBoth';
    }
}

function layoutDescKey(choice: LayoutModeChoice) {
    switch (choice) {
        case 'auto':
            return 'youtubePage.layoutAutoDesc';
        case 'remote':
            return 'youtubePage.layoutRemoteDesc';
        case 'player':
            return 'youtubePage.layoutPlayerDesc';
        case 'both':
            return 'youtubePage.layoutBothDesc';
    }
}

export function LayoutModePicker({
    tone = 'default',
    className,
    showLabel = true,
    labelStyle = 'long',
    showDescription = true,
    id = 'layout-mode-picker',
}: LayoutModePickerProps) {
    const t = useI18n();
    const { selectedChoice, changeLayoutMode } = useLayoutModeChange();

    const options = useMemo(
        () =>
            CHOICES.map((value) => ({
                value,
                label: t(layoutLabelKey(value)),
            })),
        [t],
    );

    const labelKey = labelStyle === 'short' ? 'youtubePage.layout' : 'youtubePage.selectLayoutMode';

    const selectTriggerClass = cn(
        'h-10 w-full min-w-0',
        tone === 'dark' && 'border-zinc-800 bg-zinc-900 text-zinc-100 [&_svg]:text-zinc-400',
    );

    const select = (
        <Select
            value={selectedChoice}
            onValueChange={(value) => changeLayoutMode(value as LayoutModeChoice)}
        >
            <SelectTrigger
                id={id}
                className={selectTriggerClass}
                aria-label={t('youtubePage.selectLayoutMode')}
            >
                <SelectValue placeholder={t('youtubePage.selectLayoutMode')} />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[min(16rem,50dvh)]">
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return (
        <div className={cn('space-y-2', className)}>
            {showLabel ? (
                <Label
                    htmlFor={id}
                    className={cn('text-sm font-medium', tone === 'dark' && 'text-zinc-300')}
                >
                    {t(labelKey)}
                </Label>
            ) : null}
            {select}
            {showDescription ? (
                <p
                    className={cn(
                        'text-xs text-muted-foreground',
                        tone === 'dark' && 'text-zinc-500',
                    )}
                >
                    {t(layoutDescKey(selectedChoice))}
                </p>
            ) : null}
        </div>
    );
}
