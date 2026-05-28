export const APP_LOCALES = ['vi', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_APP_LOCALE: AppLocale = 'vi';
export const LOCALE_COOKIE_NAME = 'Next-Locale';

export function stripLocaleFromPath(pathname: string): {
    locale: AppLocale | null;
    cleanPath: string;
} {
    for (const locale of APP_LOCALES) {
        if (pathname === `/${locale}`) {
            return { locale, cleanPath: '/' };
        }
        if (pathname.startsWith(`/${locale}/`)) {
            const cleanPath = pathname.slice(locale.length + 1) || '/';
            return { locale, cleanPath };
        }
    }
    return { locale: null, cleanPath: pathname };
}
