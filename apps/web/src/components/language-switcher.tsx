'use client';

import { useEffect, useState } from 'react';

import { useCurrentLocale, useScopedI18n, type SUPPORTED_LOCALES } from '@/locales/client';
import { useChangeLocale } from '@/hooks/use-change-locale';
import { cn } from '@/lib/utils';
import {
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

const LOCALE_OPTIONS: {
    code: SUPPORTED_LOCALES;
    shortLabel: string;
    menuLabelKey: 'languageVietnamese' | 'languageEnglish';
}[] = [
    { code: 'vi', shortLabel: 'Vi', menuLabelKey: 'languageVietnamese' },
    { code: 'en', shortLabel: 'En', menuLabelKey: 'languageEnglish' },
];

type LanguageSwitcherVariant = 'inline' | 'overlay' | 'menu';

type LanguageSwitcherProps = {
    variant?: LanguageSwitcherVariant;
    className?: string;
};

function LocaleToggle({
    locale,
    onChange,
    mode,
    className,
    ariaLabel,
}: {
    locale: SUPPORTED_LOCALES;
    onChange: (code: SUPPORTED_LOCALES) => void;
    mode: 'inline' | 'overlay';
    className?: string;
    ariaLabel: string;
}) {
    const isOverlay = mode === 'overlay';

    return (
        <div
            className={cn(
                'inline-flex items-center',
                isOverlay
                    ? 'gap-1 text-sm font-medium opacity-40 transition-opacity duration-300 hover:opacity-100'
                    : 'gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5 text-xs font-medium',
                className,
            )}
            role="group"
            aria-label={ariaLabel}
        >
            {LOCALE_OPTIONS.map((option, index) => (
                <span key={option.code} className="inline-flex items-center">
                    {index > 0 && (
                        <span
                            className={cn(
                                'select-none',
                                isOverlay
                                    ? 'px-0.5 text-zinc-600'
                                    : 'px-0.5 text-muted-foreground/50',
                            )}
                            aria-hidden
                        >
                            /
                        </span>
                    )}
                    <button
                        type="button"
                        className={cn(
                            'rounded-full transition-colors duration-200 focus-visible:outline-none',
                            isOverlay
                                ? cn(
                                      'px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                                      locale === option.code
                                          ? 'text-zinc-100'
                                          : 'text-zinc-500 hover:text-zinc-300',
                                  )
                                : cn(
                                      'px-2.5 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                      locale === option.code
                                          ? 'bg-background text-foreground shadow-sm'
                                          : 'text-muted-foreground hover:text-foreground',
                                  ),
                        )}
                        aria-pressed={locale === option.code}
                        aria-current={locale === option.code ? 'true' : undefined}
                        onClick={() => onChange(option.code)}
                    >
                        {option.shortLabel}
                    </button>
                </span>
            ))}
        </div>
    );
}

export function LanguageSwitcher({ variant = 'inline', className }: LanguageSwitcherProps) {
    const t = useScopedI18n('appearance');
    const locale = useCurrentLocale();
    const changeLocale = useChangeLocale({ preserveSearchParams: true });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        if (variant === 'menu') return null;
        return (
            <div
                className={cn(variant === 'overlay' ? 'h-6 w-12' : 'h-8 w-[4.25rem]', className)}
                aria-hidden
            />
        );
    }

    if (variant === 'menu') {
        return (
            <>
                <DropdownMenuLabel className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('language')}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => changeLocale(value as SUPPORTED_LOCALES)}
                >
                    {LOCALE_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option.code} value={option.code}>
                            {t(option.menuLabelKey)}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </>
        );
    }

    return (
        <LocaleToggle
            locale={locale}
            onChange={changeLocale}
            mode={variant}
            className={className}
            ariaLabel={t('language')}
        />
    );
}
