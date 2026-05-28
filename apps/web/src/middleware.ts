import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest, NextResponse } from 'next/server';

import {
    APP_LOCALES,
    DEFAULT_APP_LOCALE,
    LOCALE_COOKIE_NAME,
    stripLocaleFromPath,
} from '@/lib/locale-path';

const I18nMiddleware = createI18nMiddleware({
    defaultLocale: DEFAULT_APP_LOCALE,
    locales: [...APP_LOCALES],
    urlMappingStrategy: 'rewrite',
    resolveLocaleFromRequest: () => DEFAULT_APP_LOCALE,
});

/**
 * Locale lives in the `Next-Locale` cookie only — never in the visible URL.
 * If someone opens /en or /vi (bookmark, old link), set cookie and redirect to clean path.
 */
export function middleware(request: NextRequest) {
    const { locale, cleanPath } = stripLocaleFromPath(request.nextUrl.pathname);

    if (locale) {
        const url = request.nextUrl.clone();
        url.pathname = cleanPath;
        const response = NextResponse.redirect(url);
        response.cookies.set(LOCALE_COOKIE_NAME, locale, { sameSite: 'strict', path: '/' });
        return response;
    }

    return I18nMiddleware(request);
}

export const config = {
    matcher: [
        '/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt|manifest.webmanifest|sw.js|icons).*)',
    ],
};
