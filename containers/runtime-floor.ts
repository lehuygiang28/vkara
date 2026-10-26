import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Floors from the October 21–24, 2026 runtime advisories.
 *
 * Bun 1.4.4 fixes CVE-2026-111497 (brotli out-of-bounds write), the compromised
 * eMudhra / emSign trust anchors (GHSA-26q8-h657-pf84), and HTTP/3 QPACK
 * amplification (GHSA-cf8x-9m69-3gg3). `bun build --compile` embeds that
 * runtime, so image pins below 1.4.4 ship the vulnerable binary.
 *
 * Node.js 22.23.4, 24.22.1, and 26.12.1 are the October 21, 2026 security
 * releases (CVE-2026-111497, CVE-2026-106069, CVE-2026-106072, CVE-2026-105482,
 * CVE-2026-105481, CVE-2026-106074, CVE-2026-106073, plus the eMudhra trust
 * update). A floating tag such as `node:22-alpine` does not name a patched build.
 */
export const BUN_FLOOR = '1.4.4';

export const NODE_FLOOR_BY_MAJOR: Record<number, string> = {
    22: '22.23.4',
    24: '24.22.1',
    26: '26.12.1',
};

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'coverage']);

export type RuntimeImage = 'bun' | 'node';

export type RuntimePin = {
    file: string;
    image: RuntimeImage;
    tag: string;
    version: string | null;
};

export type FloorViolation = {
    file: string;
    detail: string;
};

export function compareSemver(left: string, right: string): number {
    const a = left.split('.').map((part) => Number(part));
    const b = right.split('.').map((part) => Number(part));
    for (let index = 0; index < 3; index++) {
        const diff = (a[index] ?? 0) - (b[index] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/** Leading x.y.z of an image tag. `1.4.4-alpine` and `22.23.4-alpine3.22` match; `22-alpine` does not. */
export function semverFromTag(tag: string): string | null {
    const withoutDigest = tag.split('@')[0] ?? tag;
    const match = /^(\d+\.\d+\.\d+)(?:-|$)/.exec(withoutDigest);
    return match?.[1] ?? null;
}

export function bunPinError(version: string | null): string | null {
    if (!version) {
        return `tag is not a full x.y.z release (Bun floor is ${BUN_FLOOR})`;
    }
    if (compareSemver(version, BUN_FLOOR) < 0) {
        return `${version} is below the patched Bun floor ${BUN_FLOOR}`;
    }
    return null;
}

export function nodePinError(version: string | null): string | null {
    if (!version) {
        return 'tag is not a full x.y.z release (floating majors such as node:22-alpine are not a patched build)';
    }
    const major = Number(version.split('.')[0]);
    const floor = NODE_FLOOR_BY_MAJOR[major];
    if (!floor) {
        return `Node ${major}.x is outside the October 2026 patched lines (22, 24, 26)`;
    }
    if (compareSemver(version, floor) < 0) {
        return `${version} is below the patched Node floor ${floor}`;
    }
    return null;
}

export function listDockerfiles(repoRoot: string): string[] {
    const found: string[] = [];
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            if (SKIP_DIRS.has(entry)) continue;
            const full = path.join(dir, entry);
            if (statSync(full).isDirectory()) {
                walk(full);
                continue;
            }
            if (entry === 'Dockerfile' || entry.endsWith('.Dockerfile')) {
                found.push(path.relative(repoRoot, full).split(path.sep).join('/'));
            }
        }
    };
    walk(repoRoot);
    found.sort();
    return found;
}

export function pinsFromDockerfile(file: string, source: string): RuntimePin[] {
    const pins: RuntimePin[] = [];
    const pattern = /^FROM\s+(oven\/bun|node):(\S+)/gm;
    for (const match of source.matchAll(pattern)) {
        const tag = match[2] ?? '';
        pins.push({
            file,
            image: match[1] === 'oven/bun' ? 'bun' : 'node',
            tag,
            version: semverFromTag(tag),
        });
    }
    return pins;
}

function pushPinError(violations: FloorViolation[], pin: RuntimePin): void {
    const error = pin.image === 'bun' ? bunPinError(pin.version) : nodePinError(pin.version);
    if (!error) return;
    violations.push({
        file: pin.file,
        detail: `${pin.image} tag ${pin.tag}: ${error}`,
    });
}

function workflowFiles(repoRoot: string): string[] {
    const dir = path.join(repoRoot, '.github', 'workflows');
    return readdirSync(dir)
        .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
        .map((name) => `.github/workflows/${name}`)
        .sort();
}

function readText(repoRoot: string, relativePath: string): string {
    return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const REQUIRED_BUN_DOCKERFILES = [
    'apps/api/Dockerfile',
    'apps/web/Dockerfile',
    'containers/aio/Dockerfile',
    'containers/api-redis/Dockerfile',
];

/**
 * Executable runtime pins: Dockerfiles, the packageManager field (local and CI
 * compiles), and setup-bun versions. Docs are checked so the written minimum
 * cannot stay on a vulnerable release.
 */
export function collectFloorViolations(repoRoot: string): FloorViolation[] {
    const violations: FloorViolation[] = [];
    const dockerfiles = listDockerfiles(repoRoot);

    for (const file of dockerfiles) {
        const pins = pinsFromDockerfile(file, readText(repoRoot, file));
        for (const pin of pins) pushPinError(violations, pin);
        if (REQUIRED_BUN_DOCKERFILES.includes(file) && !pins.some((pin) => pin.image === 'bun')) {
            violations.push({ file, detail: 'missing an oven/bun image pin' });
        }
    }

    if (!dockerfiles.some((file) => file === 'apps/web/Dockerfile')) {
        violations.push({ file: 'apps/web/Dockerfile', detail: 'web image is missing' });
    } else {
        const webPins = pinsFromDockerfile(
            'apps/web/Dockerfile',
            readText(repoRoot, 'apps/web/Dockerfile'),
        );
        if (!webPins.some((pin) => pin.image === 'node')) {
            violations.push({
                file: 'apps/web/Dockerfile',
                detail: 'production web image has no node pin',
            });
        }
    }

    const packageJson = JSON.parse(readText(repoRoot, 'package.json')) as {
        packageManager?: string;
    };
    const packageManager = packageJson.packageManager ?? '';
    const packageManagerVersion = /^bun@(\d+\.\d+\.\d+)$/.exec(packageManager)?.[1] ?? null;
    const packageManagerError = bunPinError(packageManagerVersion);
    if (packageManagerError) {
        violations.push({
            file: 'package.json',
            detail: `packageManager ${packageManager || '(missing)'}: ${packageManagerError}`,
        });
    }

    for (const file of workflowFiles(repoRoot)) {
        const source = readText(repoRoot, file);
        if (!source.includes('oven-sh/setup-bun')) continue;
        const versions = [...source.matchAll(/bun-version:\s*['"]?([^\s#'"]+)/g)];
        if (versions.length === 0) {
            violations.push({ file, detail: 'setup-bun has no bun-version pin' });
            continue;
        }
        for (const match of versions) {
            const raw = match[1] ?? '';
            const error = bunPinError(semverFromTag(raw));
            if (error) violations.push({ file, detail: `bun-version ${raw}: ${error}` });
        }
    }

    for (const file of ['README.md', 'docs/vi/README.md']) {
        const source = readText(repoRoot, file);
        const bunDoc = /\[Bun\]\([^)]+\)\s*≥\s*(\d+\.\d+\.\d+)/.exec(source);
        const bunError = bunPinError(bunDoc?.[1] ?? null);
        if (bunError) {
            violations.push({
                file,
                detail: `documented Bun minimum ${bunDoc?.[1] ?? '(missing)'}: ${bunError}`,
            });
        }
        const nodeDoc = /Node\.js\s*≥\s*(\d+\.\d+\.\d+)/.exec(source);
        const nodeError = nodePinError(nodeDoc?.[1] ?? null);
        if (nodeError) {
            violations.push({
                file,
                detail: `documented Node minimum ${nodeDoc?.[1] ?? '(unpinned)'}: ${nodeError}`,
            });
        }
    }

    return violations;
}
