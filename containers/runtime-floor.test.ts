import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
    BUN_FLOOR,
    bunPinError,
    collectFloorViolations,
    compareSemver,
    nodePinError,
    pinsFromDockerfile,
    semverFromTag,
} from './runtime-floor';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('runtime version floor', () => {
    it('accepts only full releases at or above the October 2026 patches', () => {
        expect(semverFromTag('1.4.4')).toBe('1.4.4');
        expect(semverFromTag('1.4.4-alpine')).toBe('1.4.4');
        expect(semverFromTag('22.23.4-alpine3.22')).toBe('22.23.4');
        expect(semverFromTag('22.23.4-alpine@sha256:abc')).toBe('22.23.4');
        expect(semverFromTag('22.23.4-bookworm-slim')).toBe('22.23.4');
        expect(semverFromTag('1.4.4-rc.1')).toBeNull();
        expect(semverFromTag('1.4.4-beta.2')).toBeNull();
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

    it('reads runtime images that follow FROM flags', () => {
        const source = [
            'FROM --platform=linux/amd64 oven/bun:1.3.13 AS build',
            'FROM --platform linux/amd64 node:22.23.3-alpine AS production',
            'FROM caddy:2.10-alpine AS caddy',
        ].join('\n');
        expect(pinsFromDockerfile('fixture.Dockerfile', source)).toEqual([
            {
                file: 'fixture.Dockerfile',
                image: 'bun',
                tag: '1.3.13',
                version: '1.3.13',
            },
            {
                file: 'fixture.Dockerfile',
                image: 'node',
                tag: '22.23.3-alpine',
                version: '22.23.3',
            },
        ]);
    });

    it('reports a below-floor pin from a fixture tree', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vkara-floor-'));
        try {
            writeFloorFixture(root, { bunImage: 'oven/bun:1.3.13' });
            const violations = collectFloorViolations(root);
            expect(violations).toEqual(
                expect.arrayContaining([
                    {
                        file: 'apps/api/Dockerfile',
                        detail: 'bun tag 1.3.13: 1.3.13 is below the patched Bun floor 1.4.4',
                    },
                ]),
            );
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('accepts a fixture tree pinned to the patched floors', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vkara-floor-'));
        try {
            writeFloorFixture(root, { bunImage: 'oven/bun:1.4.4' });
            expect(collectFloorViolations(root)).toEqual([]);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('requires every setup-bun step and a full setup-node release', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'vkara-floor-'));
        try {
            writeFloorFixture(root, { bunImage: 'oven/bun:1.4.4' });
            writeFileSync(
                path.join(root, '.github/workflows/ci.yml'),
                [
                    'jobs:',
                    '  ci:',
                    '    steps:',
                    '      - uses: oven-sh/setup-bun@v2',
                    '        with:',
                    '          bun-version: 1.4.4',
                    '      - uses: oven-sh/setup-bun@v2',
                    '      - uses: actions/setup-node@v7',
                    '        with:',
                    "          node-version: '24'",
                    '',
                ].join('\n'),
            );
            const violations = collectFloorViolations(root).filter(
                (violation) => violation.file === '.github/workflows/ci.yml',
            );
            expect(violations).toEqual([
                {
                    file: '.github/workflows/ci.yml',
                    detail: 'setup-bun has no bun-version pin',
                },
                {
                    file: '.github/workflows/ci.yml',
                    detail: expect.stringContaining('node-version 24:'),
                },
            ]);
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('pins container, package manager, CI, and documented Bun/Node releases to the patched floor', () => {
        expect(collectFloorViolations(repoRoot)).toEqual([]);
    });
});

function writeFloorFixture(root: string, options: { bunImage: string }): void {
    const write = (relativePath: string, contents: string) => {
        const full = path.join(root, relativePath);
        mkdirSync(path.dirname(full), { recursive: true });
        writeFileSync(full, contents);
    };
    write(
        'apps/api/Dockerfile',
        `FROM ${options.bunImage} AS build\nFROM gcr.io/distroless/base AS production\n`,
    );
    write(
        'apps/web/Dockerfile',
        'FROM oven/bun:1.4.4 AS build\nFROM node:22.23.4-alpine AS production\n',
    );
    write('containers/aio/Dockerfile', 'FROM oven/bun:1.4.4-alpine AS base\n');
    write('containers/api-redis/Dockerfile', 'FROM oven/bun:1.4.4-alpine AS build\n');
    write('package.json', JSON.stringify({ packageManager: 'bun@1.4.4' }));
    write(
        '.github/workflows/ci.yml',
        [
            'jobs:',
            '  ci:',
            '    steps:',
            '      - uses: oven-sh/setup-bun@v2',
            '        with:',
            '          bun-version: 1.4.4',
            '      - uses: actions/setup-node@v7',
            '        with:',
            "          node-version: '24.22.1'",
            '',
        ].join('\n'),
    );
    const requirements =
        '**Requirements:** [Bun](https://bun.sh) ≥ 1.4.4, Redis, Node.js 22.23.4 for production web builds (24.22.1 on Node 24, 26.12.1 on Node 26).\n';
    write('README.md', requirements);
    write('docs/vi/README.md', requirements);
}
