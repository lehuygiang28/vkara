import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest } from 'next/server';

const I18nMiddleware = createI18nMiddleware({
    defaultLocale: 'vi',
    locales: ['vi', 'en'],
    urlMappingStrategy: 'rewrite',
    resolveLocaleFromRequest: () => {
        // Let default locale be 'vi' if the user doesn't already have a `Next-Locale` cookie
        return 'vi';
    },
});

/**
 * Middleware function that processes incoming requests using the I18nMiddleware.
 * This function applies internationalization settings to the request based on
 * the provided locales, default locale, and URL mapping strategy.
 *
 * @param request - The incoming Next.js request object.
 * @returns The result of the I18nMiddleware processing the request.
 */
export function middleware(request: NextRequest) {
    return I18nMiddleware(request);
}

/**
 * Configures the matcher for the middleware to apply to all paths except
 * specific routes, such as API routes, static files, and built-in Next.js files.
 */
export const config = {
    matcher: ['/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)'],
};
