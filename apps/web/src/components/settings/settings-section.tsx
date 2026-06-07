import type { ReactNode } from 'react';

import { ScopeBadge } from '@/components/settings/scope-badge';

type SettingsSectionProps = {
    title: string;
    hint?: string;
    scope?: 'device' | 'room';
    scopeLabel?: string;
    children: ReactNode;
};

export function SettingsSection({
    title,
    hint,
    scope,
    scopeLabel,
    children,
}: SettingsSectionProps) {
    return (
        <section className="space-y-2">
            <div className="space-y-1 px-1">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {title}
                    </h2>
                    {scope && scopeLabel ? <ScopeBadge scope={scope} label={scopeLabel} /> : null}
                </div>
                {hint ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
                ) : null}
            </div>
            {children}
        </section>
    );
}

export function SettingsGroup({ children }: { children: ReactNode }) {
    return (
        <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card">
            {children}
        </div>
    );
}

export function SettingsSubheader({ children }: { children: ReactNode }) {
    return (
        <p className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
            {children}
        </p>
    );
}

export function SettingsBlock({ children }: { children: ReactNode }) {
    return <div className="space-y-4 px-4 py-4">{children}</div>;
}

export function SettingsActions({ children }: { children: ReactNode }) {
    return <div className="space-y-2">{children}</div>;
}
