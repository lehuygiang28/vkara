'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { LanguageSwitcher } from '@/components/language-switcher';
import { SettingsRow } from '@/components/settings/settings-row';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
    { value: 'light', icon: Sun, labelKey: 'light' as const },
    { value: 'dark', icon: Moon, labelKey: 'dark' as const },
    { value: 'system', icon: Monitor, labelKey: 'system' as const },
];

export function AppearanceSettingsInline() {
    const t = useScopedI18n('appearance');
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <SettingsRow
                label={t('title')}
                control={
                    mounted ? (
                        <div
                            className="inline-flex rounded-md border border-border bg-muted/40 p-0.5"
                            role="group"
                            aria-label={t('title')}
                        >
                            {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={theme === value}
                                    onClick={() => setTheme(value)}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                                        theme === value
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" aria-hidden />
                                    <span className="hidden sm:inline">{t(labelKey)}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="h-8 w-28 rounded-md bg-muted/40" aria-hidden />
                    )
                }
            />
            <SettingsRow
                label={t('language')}
                control={<LanguageSwitcher variant="inline" />}
            />
        </>
    );
}
