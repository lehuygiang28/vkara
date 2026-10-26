/**
 * Re-runnable proof that the Bun and Node image tags pinned by the Dockerfiles
 * are the patched releases, read from the registry image config (not from the
 * Dockerfile text alone).
 *
 *   bun scripts/prove-container-runtimes.mjs
 *
 * Exits non-zero when a pin is below the floor or the published image config
 * does not advertise that same release.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    bunPinError,
    collectFloorViolations,
    listDockerfiles,
    nodePinError,
    pinsFromDockerfile,
    semverFromTag,
} from '../containers/runtime-floor.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ACCEPT = [
    'application/vnd.oci.image.index.v1+json',
    'application/vnd.docker.distribution.manifest.list.v2+json',
    'application/vnd.oci.image.manifest.v1+json',
    'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

function readDockerfile(relativePath) {
    return Bun.file(path.join(repoRoot, relativePath)).text();
}

async function registryToken(repository) {
    const url = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repository}:pull`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`token for ${repository} failed: ${response.status}`);
    }
    const body = await response.json();
    if (!body.token) throw new Error(`token for ${repository} was empty`);
    return body.token;
}

async function fetchManifest(repository, reference, token) {
    const response = await fetch(
        `https://registry-1.docker.io/v2/${repository}/manifests/${reference}`,
        {
            headers: { Authorization: `Bearer ${token}`, Accept: ACCEPT },
        },
    );
    if (!response.ok) {
        throw new Error(`manifest ${repository}:${reference} failed: ${response.status}`);
    }
    return response.json();
}

async function fetchBlob(repository, digest, token) {
    const response = await fetch(`https://registry-1.docker.io/v2/${repository}/blobs/${digest}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
        throw new Error(`blob ${digest} failed: ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const jsonBytes = bytes[0] === 0x1f && bytes[1] === 0x8b ? Bun.gunzipSync(bytes) : bytes;
    return JSON.parse(new TextDecoder().decode(jsonBytes));
}

function amd64Manifest(index) {
    const manifests = index.manifests ?? [];
    const match = manifests.find(
        (entry) => entry.platform?.os === 'linux' && entry.platform?.architecture === 'amd64',
    );
    if (!match?.digest) {
        throw new Error('linux/amd64 manifest not found');
    }
    return match.digest;
}

function advertisedVersion(image, config) {
    const inner = config.config ?? {};
    if (image === 'node') {
        const entry = (inner.Env ?? []).find((item) => item.startsWith('NODE_VERSION='));
        return entry?.slice('NODE_VERSION='.length) ?? null;
    }
    const labels = inner.Labels ?? {};
    return labels['org.opencontainers.image.version'] ?? null;
}

async function imageVersion(repository, tag) {
    const token = await registryToken(repository);
    const index = await fetchManifest(repository, tag, token);
    const digest = index.config?.digest ?? amd64Manifest(index);
    const manifest = index.config?.digest ? index : await fetchManifest(repository, digest, token);
    const config = await fetchBlob(repository, manifest.config.digest, token);
    return {
        digest,
        version: advertisedVersion(repository === 'library/node' ? 'node' : 'bun', config),
        revision: config.config?.Labels?.['org.opencontainers.image.revision'] ?? null,
    };
}

async function collectPins() {
    const pins = [];
    for (const file of listDockerfiles(repoRoot)) {
        const source = await readDockerfile(file);
        for (const pin of pinsFromDockerfile(file, source)) {
            pins.push(pin);
        }
    }
    return pins;
}

function run(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    if (result.error) {
        return { ok: false, status: null, stdout: '', stderr: result.error.message };
    }
    return {
        ok: result.status === 0,
        status: result.status,
        stdout: (result.stdout ?? '').trim(),
        stderr: (result.stderr ?? '').trim(),
    };
}

function containerRuntime() {
    for (const command of ['docker', 'podman']) {
        if (run(command, ['info']).ok) return command;
    }
    return null;
}

const failures = [];

const violations = collectFloorViolations(repoRoot);
if (violations.length > 0) {
    console.error('floor violations:');
    for (const violation of violations) {
        console.error(`- ${violation.file}: ${violation.detail}`);
    }
    process.exit(1);
}
console.log('floor check: every pin is at or above the patched release');

const pins = await collectPins();
const checked = new Set();
for (const pin of pins) {
    const repository = pin.image === 'bun' ? 'oven/bun' : 'library/node';
    const key = `${repository}:${pin.tag}`;
    if (checked.has(key)) continue;
    checked.add(key);
    const expected = pin.version;
    const pinError = pin.image === 'bun' ? bunPinError(expected) : nodePinError(expected);
    if (pinError || !expected) {
        failures.push(`${key}: ${pinError ?? 'missing version'}`);
        continue;
    }
    const live = await imageVersion(repository, pin.tag);
    const liveSemver = semverFromTag(live.version ?? '') ?? live.version;
    const matches =
        live.version === expected ||
        liveSemver === expected ||
        live.version?.startsWith(`${expected}-`);
    const line = `${key} image=${live.version ?? '(none)'} revision=${live.revision ?? '(none)'} digest=${live.digest}`;
    console.log(matches ? `ok ${line}` : `MISMATCH ${line}`);
    if (!matches) failures.push(`${key} advertises ${live.version}, expected ${expected}`);
}

const previousTags = [
    ['oven/bun', '1.3.13'],
    ['oven/bun', '1.3.13-alpine'],
    ['library/node', '22-alpine'],
];
for (const [repository, tag] of previousTags) {
    const live = await imageVersion(repository, tag);
    console.log(
        `previous ${repository}:${tag} image=${live.version ?? '(none)'} digest=${live.digest}`,
    );
}

const runtime = containerRuntime();
if (!runtime) {
    console.log('container runtime: not available, registry config was the live image check');
} else {
    console.log(`container runtime: ${runtime}`);
    const uniquePins = [];
    const seenPins = new Set();
    for (const pin of pins) {
        const key = `${pin.image}:${pin.tag}`;
        if (seenPins.has(key)) continue;
        seenPins.add(key);
        uniquePins.push(pin);
    }

    for (const pin of uniquePins) {
        if (!pin.version) {
            failures.push(`${pin.image}:${pin.tag} has no release version to run`);
            continue;
        }
        const image =
            pin.image === 'bun'
                ? `docker.io/oven/bun:${pin.tag}`
                : `docker.io/library/node:${pin.tag}`;
        const args = pin.image === 'bun' ? ['bun', '--version'] : ['node', '-p', 'process.version'];
        const expectedOutput = pin.image === 'bun' ? pin.version : `v${pin.version}`;
        const result = run(runtime, ['run', '--rm', image, ...args]);
        const stdout = result.stdout.split('\n').at(-1) ?? '';
        console.log(result.ok ? `ran ${image} -> ${stdout}` : `FAILED ${image}: ${result.stderr}`);
        if (!result.ok || stdout !== expectedOutput) {
            failures.push(
                `${image} reported ${stdout || result.stderr}, expected ${expectedOutput}`,
            );
        }
    }

    const compileScript =
        'printf "%s\\n" "console.log(Bun.version)" > /tmp/v.ts && bun build /tmp/v.ts --compile --target bun --outfile /tmp/v && /tmp/v';
    for (const pin of uniquePins) {
        if (pin.image !== 'bun' || !pin.version) continue;
        const image = `docker.io/oven/bun:${pin.tag}`;
        const result = run(runtime, [
            'run',
            '--rm',
            '--entrypoint',
            'sh',
            image,
            '-c',
            compileScript,
        ]);
        const embedded = result.stdout.split('\n').at(-1) ?? '';
        console.log(
            result.ok
                ? `compile ${image} embeds ${embedded}`
                : `FAILED compile ${image}: ${result.stderr}`,
        );
        if (!result.ok || embedded !== pin.version) {
            failures.push(
                `${image} compiled binary embedded ${embedded || result.stderr}, expected ${pin.version}`,
            );
        }
    }
}

if (failures.length > 0) {
    console.error('proof failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log('proof ok');
