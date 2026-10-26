import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
    BUN_FLOOR,
    bunPinError,
    collectFloorViolations,
    compareSemver,
    nodePinError,
    semverFromTag,
} from './runtime-floor';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('runtime version floor', () => {
    it('accepts only full releases at or above the October 2026 patches', () => {
        expect(semverFromTag('1.4.4')).toBe('1.4.4');
        expect(semverFromTag('1.4.4-alpine')).toBe('1.4.4');
        expect(semverFromTag('22.23.4-alpine3.22')).toBe('22.23.4');
        expect(semverFromTag('22.23.4-alpine@sha256:abc')).toBe('22.23.4');
        expect(semverFromTag('22-alpine')).toBeNull();
        expect(semverFromTag('1-alpine')).toBeNull();
        expect(semverFromTag('latest')).toBeNull();

        expect(compareSemver('1.4.4', BUN_FLOOR)).toBe(0);
        expect(compareSemver('1.4.3', BUN_FLOOR)).toBeLessThan(0);
        expect(compareSemver('1.3.13', BUN_FLOOR)).toBeLessThan(0);

        expect(bunPinError('1.4.4')).toBeNull();
        expect(bunPinError('1.3.13')).toMatch(/below the patched Bun floor 1\.4\.4/);
        expect(bunPinError(null)).toMatch(/not a full x\.y\.z/);

        expect(nodePinError('22.23.4')).toBeNull();
        expect(nodePinError('24.22.1')).toBeNull();
        expect(nodePinError('26.12.1')).toBeNull();
        expect(nodePinError('22.23.3')).toMatch(/below the patched Node floor 22\.23\.4/);
        expect(nodePinError(null)).toMatch(/node:22-alpine/);
    });

    it('pins container, package manager, CI, and documented Bun/Node releases to the patched floor', () => {
        expect(collectFloorViolations(repoRoot)).toEqual([]);
    });
});
