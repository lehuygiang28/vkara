import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { APP_LOCALES, DEFAULT_APP_LOCALE, LOCALE_COOKIE_NAME } from '@/lib/locale-path';

const I18nMiddleware = createI18nMiddleware({
    defaultLocale: DEFAULT_APP_LOCALE,
    locales: [...APP_LOCALES],
    urlMappingStrategy: 'rewrite',
    resolveLocaleFromRequest: () => DEFAULT_APP_LOCALE,
});

/**
 * Default locale (vi) is served at `/` with no prefix.
 * English is at `/en`. Legacy `/vi` URLs redirect to `/`.
 *
 * Skip redirect on internal Next.js subrequests (RSC, prefetch, middleware rewrite).
 * AIO image also handles /vi at the Caddy edge.
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isInternalSubrequest =
        request.headers.has('rsc') ||
        request.headers.get('purpose') === 'prefetch' ||
        request.headers.has('x-middleware-subrequest');

    if (
        process.env.VKARA_AIO !== '1' &&
        !isInternalSubrequest &&
        (pathname === '/vi' || pathname.startsWith('/vi/'))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(3) || '/';
        const response = NextResponse.redirect(url, 301);
        response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_APP_LOCALE, {
            sameSite: 'strict',
            path: '/',
        });
        return response;
    }

    const localeSegment = pathname.split('/').filter(Boolean)[0];
    if (localeSegment === 'en') {
        const response = NextResponse.next();
        response.cookies.set(LOCALE_COOKIE_NAME, 'en', { sameSite: 'strict', path: '/' });
        return response;
    }

    const response = I18nMiddleware(request);

    if (pathname === '/') {
        response.cookies.set(LOCALE_COOKIE_NAME, DEFAULT_APP_LOCALE, {
            sameSite: 'strict',
            path: '/',
        });
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt|manifest.webmanifest|sw.js|icons).*)',
    ],
};
