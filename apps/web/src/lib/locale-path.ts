export const APP_LOCALES = ['vi', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_APP_LOCALE: AppLocale = 'vi';
export const LOCALE_COOKIE_NAME = 'Next-Locale';

/** Public URL for a locale. Default locale (vi) has no prefix. */
export function getLocalePublicPath(locale: AppLocale): string {
    return locale === DEFAULT_APP_LOCALE ? '/' : `/${locale}`;
}

function isAppLocale(segment: string): segment is AppLocale {
    return (APP_LOCALES as readonly string[]).includes(segment);
}

/**
 * Recover locale from malformed paths like `/vien` (vi + en glued, no slash).
 * Single-segment paths (`/vi`, `/en`) are handled by the normal stripper.
 */
function parseConcatenatedLocalePrefix(pathname: string): {
    locale: AppLocale | null;
    cleanPath: string;
} | null {
    const match = pathname.match(/^\/((?:vi|en)+)(\/.*)?$/);
    if (!match) {
        return null;
    }

    const blob = match[1];
    const rest = match[2] ?? '';
    const segments: AppLocale[] = [];

    for (let i = 0; i < blob.length; ) {
        if (blob.startsWith('vi', i)) {
            segments.push('vi');
            i += 2;
            continue;
        }
        if (blob.startsWith('en', i)) {
            segments.push('en');
            i += 2;
            continue;
        }
        return null;
    }

    if (segments.length < 2) {
        return null;
    }

    return {
        locale: segments.at(-1) ?? null,
        cleanPath: rest || '/',
    };
}

export function stripLocaleFromPath(pathname: string): {
    locale: AppLocale | null;
    cleanPath: string;
} {
    const concatenated = parseConcatenatedLocalePrefix(pathname);
    if (concatenated?.locale) {
        return concatenated;
    }

    let path = pathname;
    let detectedLocale: AppLocale | null = null;

    while (true) {
        let stripped = false;
        for (const locale of APP_LOCALES) {
            if (path === `/${locale}`) {
                detectedLocale = locale;
                path = '/';
                stripped = true;
                break;
            }
            if (path.startsWith(`/${locale}/`)) {
                detectedLocale = locale;
                path = path.slice(`/${locale}`.length) || '/';
                stripped = true;
                break;
            }
        }
        if (!stripped) {
            break;
        }
    }

    while (path !== '/') {
        const firstSegment = path.split('/').filter(Boolean)[0];
        if (!firstSegment || !isAppLocale(firstSegment)) {
            break;
        }
        detectedLocale = firstSegment;
        path = path.slice(`/${firstSegment}`.length) || '/';
    }

    return { locale: detectedLocale, cleanPath: path };
}

/** Visible path when switching locale. Vi uses `/`, en uses `/en`. */
export function buildLocalePrefixedPath(pathname: string, locale: AppLocale): string {
    const { cleanPath } = stripLocaleFromPath(pathname);
    const localeRoot = getLocalePublicPath(locale);

    if (cleanPath === '/') {
        return localeRoot;
    }

    const firstSegment = cleanPath.split('/').filter(Boolean)[0];
    if (firstSegment && isAppLocale(firstSegment)) {
        return localeRoot;
    }

    if (locale === DEFAULT_APP_LOCALE) {
        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    }

    return `/${locale}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

/** Root invite path for the current locale (app has a single page at `/`). */
export function buildLocaleSharePath(locale: AppLocale): string {
    return getLocalePublicPath(locale);
}
