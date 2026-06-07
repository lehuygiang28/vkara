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

export function parseEnvPositiveIntValue(raw: string | undefined, defaultValue: number): number {
    const trimmed = raw?.trim();
    if (!trimmed) {
        return defaultValue;
    }
    const parsed = Number.parseInt(trimmed, 10);
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
