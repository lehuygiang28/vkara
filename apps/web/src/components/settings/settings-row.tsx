import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

type SettingsRowProps = {
    label: string;
    hint?: string;
    htmlFor?: string;
    control: ReactNode;
};

export function SettingsRow({ label, hint, htmlFor, control }: SettingsRowProps) {
    return (
        <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
                    {label}
                </Label>
                {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
            </div>
            <div className="shrink-0">{control}</div>
        </div>
    );
}
