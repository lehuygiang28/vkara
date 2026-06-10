import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

import { envSkipValidation, parseEnvFlagValue } from './base';

/** TLS-related env strings from `tlsEnv()` or validated API `env`. */
export type TlsEnvValues = Pick<ReturnType<typeof tlsEnv>, 'VKARA_TLS_INSECURE'>;

export function tlsEnv() {
    return createEnv({
        server: {
            VKARA_TLS_INSECURE: z.string().optional(),
        },
        runtimeEnv: {
            VKARA_TLS_INSECURE: process.env.VKARA_TLS_INSECURE,
        },
        emptyStringAsUndefined: true,
        skipValidation: envSkipValidation(),
    });
}

/**
 * When enabled, outbound HTTPS fetches skip TLS certificate verification.
 * Dev/WSL/corporate proxy only — never enable in production.
 */
export function isTlsInsecureEnabled(tls: TlsEnvValues): boolean {
    return parseEnvFlagValue(tls.VKARA_TLS_INSECURE, false);
}

/** Apply process-wide TLS bypass for Bun/Node HTTPS clients when the flag is on. */
export function applyTlsInsecureRuntime(tls: TlsEnvValues): boolean {
    if (!isTlsInsecureEnabled(tls)) {
        return false;
    }

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    return true;
}
