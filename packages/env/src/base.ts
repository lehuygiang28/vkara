/**
 * Canonical VKARA env parsers (boolean flags and positive integers).
 * Flags: `true` | `false` | `1` | `0` | `yes` | `no` | `on` | `off` (case-insensitive).
 */

const ENV_FLAG_TRUE = new Set(['true', '1', 'yes', 'on']);
const ENV_FLAG_FALSE = new Set(['false', '0', 'no', 'off']);

export function parseEnvFlagValue(raw: string | undefined, defaultValue = false): boolean {
    const normalized = raw?.trim().toLowerCase();
    if (!normalized) {
        return defaultValue;
    }
    if (ENV_FLAG_TRUE.has(normalized)) {
        return true;
    }
    if (ENV_FLAG_FALSE.has(normalized)) {
        return false;
    }
    return defaultValue;
}

export function parseEnvFlag(name: string, defaultValue = false): boolean {
    return parseEnvFlagValue(process.env[name], defaultValue);
}

export function parseEnvPositiveInt(name: string, defaultValue: number): number {
    const raw = process.env[name]?.trim();
    if (!raw) {
        return defaultValue;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue;
    }
    return parsed;
}

export function envSkipValidation(): boolean {
    return (
        !!process.env.CI ||
        process.env.npm_lifecycle_event === 'lint' ||
        process.env.BUN_TESTING === '1'
    );
}
