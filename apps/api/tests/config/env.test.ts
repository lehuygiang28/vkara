import { afterEach, describe, expect, it } from 'vitest';

import { parseEnvFlag, parseEnvPositiveInt } from '@vkara/env/base';

describe('parseEnvFlag', () => {
    const key = 'TEST_VKARA_FLAG';

    afterEach(() => {
        delete process.env[key];
    });

    it('defaults when unset', () => {
        expect(parseEnvFlag(key, false)).toBe(false);
        expect(parseEnvFlag(key, true)).toBe(true);
    });

    it('parses canonical true/false values', () => {
        for (const value of ['true', 'TRUE', '1', 'yes', 'on']) {
            process.env[key] = value;
            expect(parseEnvFlag(key)).toBe(true);
        }

        for (const value of ['false', 'FALSE', '0', 'no', 'off']) {
            process.env[key] = value;
            expect(parseEnvFlag(key)).toBe(false);
        }
    });

    it('returns default for unknown values', () => {
        process.env[key] = 'maybe';
        expect(parseEnvFlag(key, false)).toBe(false);
    });
});

describe('parseEnvPositiveInt', () => {
    const key = 'TEST_VKARA_INT';

    afterEach(() => {
        delete process.env[key];
    });

    it('defaults when unset or invalid', () => {
        expect(parseEnvPositiveInt(key, 99)).toBe(99);
        process.env[key] = 'nope';
        expect(parseEnvPositiveInt(key, 99)).toBe(99);
        process.env[key] = '0';
        expect(parseEnvPositiveInt(key, 99)).toBe(99);
    });

    it('parses positive integers', () => {
        process.env[key] = '3600';
        expect(parseEnvPositiveInt(key, 99)).toBe(3600);
    });
});
