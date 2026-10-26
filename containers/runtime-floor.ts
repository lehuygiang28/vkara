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

/** Debian/Ubuntu/Alpine image suffixes. Prerelease ids such as `rc.1` are not variants. */
const IMAGE_VARIANT =
    /^(?:alpine(?:\d+(?:\.\d+)*)?|slim|distroless|(?:bookworm|bullseye|trixie|noble|jammy)(?:-slim)?)$/;

/**
 * Leading x.y.z of a release image tag.
 * `1.4.4-alpine` and `22.23.4-bookworm-slim` match. `1.4.4-rc.1` and `22-alpine` do not.
 */
export function semverFromTag(tag: string): string | null {
    const withoutDigest = (tag.split('@')[0] ?? tag).trim();
    const match = /^(\d+\.\d+\.\d+)(?:-([A-Za-z0-9.]+(?:-[A-Za-z0-9.]+)*))?$/.exec(withoutDigest);
    if (!match?.[1]) return null;
    const variant = match[2];
    if (variant && !IMAGE_VARIANT.test(variant)) return null;
    return match[1];
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
    for (const match of source.matchAll(/^FROM\s+(.+)$/gm)) {
        const tokens = (match[1] ?? '').trim().split(/\s+/);
        let index = 0;
        while (index < tokens.length) {
            const token = tokens[index] ?? '';
            if (token === 'AS' || token === 'as') break;
            if (token.startsWith('--')) {
                index += token.includes('=') ? 1 : 2;
                continue;
            }
            const image = /^(oven\/bun|node):(\S+)$/.exec(token);
            if (image?.[1] && image[2]) {
                pins.push({
                    file,
                    image: image[1] === 'oven/bun' ? 'bun' : 'node',
                    tag: image[2],
                    version: semverFromTag(image[2]),
                });
            }
            break;
        }
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

function tryRead(repoRoot: string, relativePath: string): string | null {
    try {
        return readText(repoRoot, relativePath);
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
    }
}

type WorkflowStep = {
    uses: string;
    inputs: Map<string, string>;
};

/** One GitHub Actions step, so a later pin cannot cover an earlier unpinned `uses`. */
function workflowSteps(source: string): WorkflowStep[] {
    const lines = source.split('\n');
    const steps: WorkflowStep[] = [];
    let index = 0;
    while (index < lines.length) {
        const start = /^(\s*)-\s+/.exec(lines[index] ?? '');
        if (!start) {
            index += 1;
            continue;
        }
        const indent = start[1]?.length ?? 0;
        const block: string[] = [];
        while (index < lines.length) {
            const line = lines[index] ?? '';
            if (block.length > 0 && line.trim() !== '') {
                const lineIndent = /^(\s*)/.exec(line)?.[1]?.length ?? 0;
                if (lineIndent <= indent && /^\s*-\s+/.test(line)) break;
                if (lineIndent < indent) break;
            }
            block.push(line);
            index += 1;
        }
        const text = block.join('\n');
        const uses = /(?:^|\n)\s*(?:-\s+)?uses:\s*['"]?([^\s#'"]+)/.exec(text)?.[1];
        if (!uses) continue;
        const inputs = new Map<string, string>();
        const withBody = text
            .split(/\n\s*with:\s*\n/)
            .slice(1)
            .join('\n');
        for (const input of withBody.matchAll(/^\s+([A-Za-z0-9_-]+):\s*['"]?([^\s#'"]+)/gm)) {
            if (input[1] && input[2]) inputs.set(input[1], input[2]);
        }
        steps.push({ uses, inputs });
    }
    return steps;
}

const REQUIRED_BUN_DOCKERFILES = [
    'apps/api/Dockerfile',
    'apps/web/Dockerfile',
    'containers/aio/Dockerfile',
    'containers/api-redis/Dockerfile',
];

/**
 * Executable runtime pins: Dockerfiles, the packageManager field (local and CI
 * compiles), and each setup-bun / setup-node step. Docs must name every
 * patched Node line, because `Node.js ≥ 22.23.4` reads as any later major.
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
        for (const step of workflowSteps(readText(repoRoot, file))) {
            if (step.uses.startsWith('oven-sh/setup-bun')) {
                const raw = step.inputs.get('bun-version');
                if (!raw) {
                    violations.push({ file, detail: 'setup-bun has no bun-version pin' });
                    continue;
                }
                const error = bunPinError(semverFromTag(raw));
                if (error) violations.push({ file, detail: `bun-version ${raw}: ${error}` });
            }
            if (step.uses.startsWith('actions/setup-node')) {
                const raw = step.inputs.get('node-version');
                if (!raw) {
                    violations.push({ file, detail: 'setup-node has no node-version pin' });
                    continue;
                }
                const error = nodePinError(semverFromTag(raw));
                if (error) violations.push({ file, detail: `node-version ${raw}: ${error}` });
            }
        }
    }

    for (const file of ['README.md', 'docs/vi/README.md']) {
        pushDocErrors(violations, file, readText(repoRoot, file), true);
    }

    const tvPath = 'docs/standalone-tv-deployment.md';
    const tvSource = tryRead(repoRoot, tvPath);
    if (tvSource !== null) pushDocErrors(violations, tvPath, tvSource, false);

    const vercelPath = 'apps/web/vercel.json';
    const vercelSource = tryRead(repoRoot, vercelPath);
    if (vercelSource !== null) {
        const vercel = JSON.parse(vercelSource) as { bunVersion?: string };
        if (vercel.bunVersion !== '1.4.x') {
            violations.push({
                file: vercelPath,
                detail: `bunVersion ${vercel.bunVersion ?? '(missing)'} must be 1.4.x (Vercel does not accept an exact 1.4.4 pin)`,
            });
        }
    }

    return violations;
}

function pushDocErrors(
    violations: FloorViolation[],
    file: string,
    source: string,
    requireNodeFloors: boolean,
): void {
    const bunDoc = /Bun(?:\]\([^)]+\))?\s*≥\s*(\d+\.\d+\.\d+)/.exec(source);
    const bunError = bunPinError(bunDoc?.[1] ?? null);
    if (bunError) {
        violations.push({
            file,
            detail: `documented Bun minimum ${bunDoc?.[1] ?? '(missing)'}: ${bunError}`,
        });
    }
    if (!requireNodeFloors) return;
    const requiredNodeDocs = Object.values(NODE_FLOOR_BY_MAJOR);
    const missingNodeDocs = requiredNodeDocs.filter((version) => !source.includes(version));
    if (missingNodeDocs.length === 0) return;
    violations.push({
        file,
        detail: `documented Node releases must name ${requiredNodeDocs.join(', ')} (missing ${missingNodeDocs.join(', ')})`,
    });
}
