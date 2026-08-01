#!/usr/bin/env node
/**
 * Trigger EAS Android APK build for TV.
 * Forwards VKARA_TV_URL / VKARA_ALLOW_CLEARTEXT into the remote builder env
 * (EAS workers do not inherit the local shell env for app.config evaluation).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const profileName = process.argv[2] || 'production';

const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const profile = eas.build?.[profileName];
if (!profile) {
    console.error(`error: unknown EAS profile "${profileName}"`);
    process.exit(1);
}

const envForward = {
    EXPO_TV: '1',
    ...(process.env.VKARA_TV_URL
        ? { VKARA_TV_URL: process.env.VKARA_TV_URL }
        : {}),
    ...(process.env.VKARA_ALLOW_CLEARTEXT
        ? { VKARA_ALLOW_CLEARTEXT: process.env.VKARA_ALLOW_CLEARTEXT }
        : {}),
};

const patched = {
    ...eas,
    build: {
        ...eas.build,
        [profileName]: {
            ...profile,
            env: {
                ...(profile.env ?? {}),
                ...envForward,
            },
        },
    },
};

const dir = mkdtempSync(join(tmpdir(), 'vkara-eas-'));
const easPath = join(dir, 'eas.json');
writeFileSync(easPath, JSON.stringify(patched, null, 2));

const env = {
    ...process.env,
    EXPO_TV: '1',
};

const args = [
    'eas-cli',
    'build',
    '--platform',
    'android',
    '--profile',
    profileName,
    '--non-interactive',
    '--wait',
];

console.log(`EAS profile env: ${JSON.stringify(patched.build[profileName].env)}`);
console.log(`Running: bunx ${args.join(' ')} (cwd=${root})`);
// eas-cli reads ./eas.json from cwd — temporarily replace then restore
const liveEas = join(root, 'eas.json');
const backup = readFileSync(liveEas, 'utf8');
writeFileSync(liveEas, JSON.stringify(patched, null, 2));
const result = spawnSync('bunx', args, { cwd: root, env, stdio: 'inherit' });
writeFileSync(liveEas, backup);
process.exit(result.status ?? 1);
