import { describe, expect, it } from 'vitest';

import {
    APP_LOCALES,
    buildLocalePrefixedPath,
    buildLocaleSharePath,
    DEFAULT_APP_LOCALE,
    getLocalePublicPath,
    isAppLocale,
    stripLocaleFromPath,
} from '@/lib/locale-path';

describe('isAppLocale', () => {
    it('accepts supported locales only', () => {
        for (const locale of APP_LOCALES) {
            expect(isAppLocale(locale)).toBe(true);
        }
        expect(isAppLocale('fr')).toBe(false);
        expect(isAppLocale('')).toBe(false);
    });
});

describe('getLocalePublicPath', () => {
    it('omits prefix for default locale', () => {
        expect(getLocalePublicPath(DEFAULT_APP_LOCALE)).toBe('/');
        expect(getLocalePublicPath('en')).toBe('/en');
    });
});

describe('stripLocaleFromPath', () => {
    it('strips single locale prefix', () => {
        expect(stripLocaleFromPath('/en/search')).toEqual({
            locale: 'en',
            cleanPath: '/search',
        });
        expect(stripLocaleFromPath('/vi')).toEqual({ locale: 'vi', cleanPath: '/' });
    });

    it('leaves non-locale paths untouched', () => {
        expect(stripLocaleFromPath('/search')).toEqual({
            locale: null,
            cleanPath: '/search',
        });
    });

    it('parses concatenated locale blobs like /vien', () => {
        expect(stripLocaleFromPath('/vien/room')).toEqual({
            locale: 'en',
            cleanPath: '/room',
        });
    });
});

describe('buildLocalePrefixedPath', () => {
    it('maps vi paths without prefix', () => {
        expect(buildLocalePrefixedPath('/en/foo', 'vi')).toBe('/foo');
    });

    it('prefixes en paths', () => {
        expect(buildLocalePrefixedPath('/foo', 'en')).toBe('/en/foo');
        expect(buildLocalePrefixedPath('/', 'en')).toBe('/en');
    });
});

describe('buildLocaleSharePath', () => {
    it('matches public locale root', () => {
        expect(buildLocaleSharePath('vi')).toBe('/');
        expect(buildLocaleSharePath('en')).toBe('/en');
    });
});
