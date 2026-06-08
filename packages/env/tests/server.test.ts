import { describe, expect, it } from 'vitest';

import { parseEnvOriginList } from '../src/base';
import { resolveCorsConfig } from '../src/server';

describe('parseEnvOriginList', () => {
    it('returns empty array when unset', () => {
        expect(parseEnvOriginList(undefined)).toEqual([]);
        expect(parseEnvOriginList('')).toEqual([]);
        expect(parseEnvOriginList('   ')).toEqual([]);
    });

    it('parses comma-separated origins', () => {
        expect(
            parseEnvOriginList('http://localhost:3000, https://vkara.example.com ,https://www.vkara.example.com'),
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
