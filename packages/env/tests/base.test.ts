import { describe, expect, it } from 'vitest';

import { parseEnvFlagValue, parseEnvPositiveIntValue } from '../src/base';

describe('parseEnvFlagValue', () => {
    it('defaults when unset', () => {
        expect(parseEnvFlagValue(undefined, false)).toBe(false);
        expect(parseEnvFlagValue(undefined, true)).toBe(true);
    });

    it('parses canonical true/false values', () => {
        for (const value of ['true', 'TRUE', '1', 'yes', 'on']) {
            expect(parseEnvFlagValue(value)).toBe(true);
        }

        for (const value of ['false', 'FALSE', '0', 'no', 'off']) {
            expect(parseEnvFlagValue(value)).toBe(false);
        }
    });

    it('returns default for unknown values', () => {
        expect(parseEnvFlagValue('maybe', false)).toBe(false);
    });
});

describe('parseEnvPositiveIntValue', () => {
    it('defaults when unset or invalid', () => {
        expect(parseEnvPositiveIntValue(undefined, 99)).toBe(99);
        expect(parseEnvPositiveIntValue('nope', 99)).toBe(99);
        expect(parseEnvPositiveIntValue('0', 99)).toBe(99);
    });

    it('parses positive integers', () => {
        expect(parseEnvPositiveIntValue('3600', 99)).toBe(3600);
    });
});
