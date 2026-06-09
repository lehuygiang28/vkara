import { describe, expect, it } from 'vitest';

import { parseEnvOriginList } from '../src/base';
import { isCorsOriginAllowed, resolveCorsConfig, resolveWsUpgradeCorsHeaders } from '../src/server';

describe('parseEnvOriginList', () => {
    it('returns empty array when unset', () => {
        expect(parseEnvOriginList(undefined)).toEqual([]);
        expect(parseEnvOriginList('')).toEqual([]);
        expect(parseEnvOriginList('   ')).toEqual([]);
    });

    it('parses comma-separated origins', () => {
        expect(
            parseEnvOriginList(
                'http://localhost:3000, https://vkara.example.com ,https://www.vkara.example.com',
            ),
        ).toEqual([
            'http://localhost:3000',
            'https://vkara.example.com',
            'https://www.vkara.example.com',
        ]);
    });
});

describe('resolveCorsConfig', () => {
    it('allows all origins when CORS_ORIGINS is unset', () => {
        expect(resolveCorsConfig(undefined)).toEqual({ origin: true });
        expect(resolveCorsConfig('')).toEqual({ origin: true });
    });

    it('returns origin string array for @elysiajs/cors multi-domain config', () => {
        expect(resolveCorsConfig('http://localhost:3000,https://vkara.example.com')).toEqual({
            origin: ['http://localhost:3000', 'https://vkara.example.com'],
        });
    });

    it('rejects invalid origins at config time', () => {
        expect(() => resolveCorsConfig('not-a-url')).toThrow(/Invalid CORS origin/);
    });
});

describe('isCorsOriginAllowed', () => {
    it('allows any origin when CORS_ORIGINS is unset', () => {
        expect(isCorsOriginAllowed('https://vkara.example.com', undefined)).toBe(true);
        expect(isCorsOriginAllowed(null, undefined)).toBe(true);
    });

    it('allows only listed origins when CORS_ORIGINS is set', () => {
        const corsOrigins = 'https://vkara-local.giang.io.vn,http://localhost:3000';
        expect(isCorsOriginAllowed('https://vkara-local.giang.io.vn', corsOrigins)).toBe(true);
        expect(isCorsOriginAllowed('https://evil.example.com', corsOrigins)).toBe(false);
        expect(isCorsOriginAllowed(null, corsOrigins)).toBe(false);
    });
});

describe('resolveWsUpgradeCorsHeaders', () => {
    it('reflects allowed origin on upgrade', () => {
        expect(
            resolveWsUpgradeCorsHeaders(
                'https://vkara-local.giang.io.vn',
                'https://vkara-local.giang.io.vn',
            ),
        ).toEqual({
            'access-control-allow-origin': 'https://vkara-local.giang.io.vn',
            vary: 'Origin',
            'access-control-allow-credentials': 'true',
        });
    });

    it('returns no headers for disallowed origin', () => {
        expect(
            resolveWsUpgradeCorsHeaders(
                'https://evil.example.com',
                'https://vkara-local.giang.io.vn',
            ),
        ).toEqual({});
    });
});
