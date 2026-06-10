import { describe, expect, it } from 'vitest';

import { applyTlsInsecureRuntime, isTlsInsecureEnabled } from '../src/tls';

describe('isTlsInsecureEnabled', () => {
    it('defaults to secure TLS verification', () => {
        expect(isTlsInsecureEnabled({})).toBe(false);
        expect(isTlsInsecureEnabled({ VKARA_TLS_INSECURE: undefined })).toBe(false);
    });

    it('enables insecure TLS when the flag is true', () => {
        expect(isTlsInsecureEnabled({ VKARA_TLS_INSECURE: 'true' })).toBe(true);
        expect(isTlsInsecureEnabled({ VKARA_TLS_INSECURE: '1' })).toBe(true);
    });

    it('keeps secure TLS when the flag is false', () => {
        expect(isTlsInsecureEnabled({ VKARA_TLS_INSECURE: 'false' })).toBe(false);
        expect(isTlsInsecureEnabled({ VKARA_TLS_INSECURE: '0' })).toBe(false);
    });
});

describe('applyTlsInsecureRuntime', () => {
    it('sets NODE_TLS_REJECT_UNAUTHORIZED when insecure TLS is enabled', () => {
        const previousFlag = process.env.VKARA_TLS_INSECURE;
        const previousNodeTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

        process.env.VKARA_TLS_INSECURE = 'true';
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

        expect(applyTlsInsecureRuntime({ VKARA_TLS_INSECURE: process.env.VKARA_TLS_INSECURE })).toBe(
            true,
        );
        expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');

        process.env.VKARA_TLS_INSECURE = previousFlag;
        if (previousNodeTls === undefined) {
            delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        } else {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousNodeTls;
        }
    });
});
