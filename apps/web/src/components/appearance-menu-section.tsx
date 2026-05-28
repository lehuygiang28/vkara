'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { useScopedI18n } from '@/locales/client';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function AppearanceMenuSection() {
    const t = useScopedI18n('appearance');
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <>
                <DropdownMenuLabel>{t('title')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
            </>
        );
    }

    return (
        <>
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('title')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light" className="gap-2">
                    <Sun className="h-4 w-4" />
                    {t('light')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="gap-2">
                    <Moon className="h-4 w-4" />
                    {t('dark')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="gap-2">
                    <Monitor className="h-4 w-4" />
                    {t('system')}
                </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <LanguageSwitcher variant="menu" />
            <DropdownMenuSeparator />
        </>
    );
}
