/**
 * Shared VKARA API env parsing.
 * Flags: `true` | `false` | `1` | `0` | `yes` | `no` | `on` | `off` (case-insensitive).
 * Unset flags use the provided default (usually `false`).
 */

const ENV_FLAG_TRUE = new Set(['true', '1', 'yes', 'on']);
const ENV_FLAG_FALSE = new Set(['false', '0', 'no', 'off']);

export function parseEnvFlag(name: string, defaultValue = false): boolean {
    const raw = process.env[name]?.trim().toLowerCase();
    if (!raw) {
        return defaultValue;
    }
    if (ENV_FLAG_TRUE.has(raw)) {
        return true;
    }
    if (ENV_FLAG_FALSE.has(raw)) {
        return false;
    }
    return defaultValue;
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
