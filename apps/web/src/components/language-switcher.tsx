'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';

import {
    useChangeLocale,
    useCurrentLocale,
    useScopedI18n,
    type SUPPORTED_LOCALES,
} from '@/locales/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

const LOCALES: SUPPORTED_LOCALES[] = ['vi', 'en'];

type LanguageSwitcherProps = {
    variant?: 'compact' | 'menu';
    className?: string;
};

export function LanguageSwitcher({ variant = 'compact', className }: LanguageSwitcherProps) {
    const t = useScopedI18n('appearance');
    const locale = useCurrentLocale();
    const changeLocale = useChangeLocale({ preserveSearchParams: true });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return variant === 'compact' ? (
            <div className={cn('h-9 w-[4.5rem]', className)} aria-hidden />
        ) : null;
    }

    if (variant === 'menu') {
        return (
            <>
                <DropdownMenuLabel className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('language')}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => changeLocale(value as SUPPORTED_LOCALES)}
                >
                    <DropdownMenuRadioItem value="vi" className="gap-2">
                        <Languages className="h-4 w-4" />
                        {t('languageVietnamese')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="en" className="gap-2">
                        <Languages className="h-4 w-4" />
                        {t('languageEnglish')}
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </>
        );
    }

    return (
        <div
            className={cn(
                'inline-flex rounded-lg border border-border/80 bg-muted/30 p-0.5',
                className,
            )}
            role="group"
            aria-label={t('language')}
        >
            {LOCALES.map((code) => (
                <Button
                    key={code}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'h-8 min-w-[2.25rem] rounded-md px-2.5 text-xs font-semibold',
                        locale === code
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-pressed={locale === code}
                    onClick={() => changeLocale(code)}
                >
                    {code === 'vi' ? 'VI' : 'EN'}
                </Button>
            ))}
        </div>
    );
}
