'use client';

import { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { useCurrentLocale, type SUPPORTED_LOCALES } from '@/locales/client';
import {
    LOCALE_COOKIE_NAME,
    buildLocalePrefixedPath,
    type AppLocale,
} from '@/lib/locale-path';

const localeLoaders: Record<SUPPORTED_LOCALES, () => Promise<{ default: unknown }>> = {
    vi: () => import('@/locales/vi'),
    en: () => import('@/locales/en'),
};

type UseChangeLocaleOptions = {
    preserveSearchParams?: boolean;
};

/** Switch locale: vi stays at `/`, en navigates to `/en`. */
export function useChangeLocale(options: UseChangeLocaleOptions = {}) {
    const { preserveSearchParams = true } = options;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLocale = useCurrentLocale();

    return useCallback(
        async (newLocale: SUPPORTED_LOCALES) => {
            if (newLocale === currentLocale) return;

            await localeLoaders[newLocale]();

            document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; SameSite=Strict`;

            const nextPath = buildLocalePrefixedPath(pathname, newLocale as AppLocale);
            const qs =
                preserveSearchParams && searchParams.toString()
                    ? `?${searchParams.toString()}`
                    : '';

            router.push(`${nextPath}${qs}`);
            router.refresh();
        },
        [currentLocale, pathname, preserveSearchParams, router, searchParams],
    );
}
