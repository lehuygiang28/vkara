#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);

function fail(msg) {
    console.error(`error: ${msg}`);
    process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const defaultTvUrl = String(pkg.vkara?.defaultTvUrl ?? '').trim();
if (!defaultTvUrl.startsWith('http://') && !defaultTvUrl.startsWith('https://')) {
    fail('package.json vkara.defaultTvUrl must start with http:// or https://');
}

const envUrl = (process.env.VKARA_TV_URL ?? '').trim();
const expectedUrl = envUrl || defaultTvUrl;
const allowCleartext = process.env.VKARA_ALLOW_CLEARTEXT === '1';

if (envUrl && !envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
    fail('VKARA_TV_URL must start with http:// or https://');
}

if (expectedUrl.startsWith('http://') && !allowCleartext) {
    fail('http:// handoff URL requires VKARA_ALLOW_CLEARTEXT=1');
}

// Evaluate app.config.js directly (same module EAS/Expo load) — fail closed.
let exp;
try {
    const loadConfig = require(join(root, 'app.config.js'));
    exp = loadConfig({ config: {} });
} catch (err) {
    fail(`app.config.js evaluation failed: ${err?.message ?? err}`);
}

const bakedUrl = String(exp.extra?.vkaraTvUrl ?? '');
const bakedCleartext = Boolean(exp.extra?.allowCleartext);
const androidPackage = String(exp.android?.package ?? '');

if (bakedUrl !== expectedUrl) {
    fail(`baked vkaraTvUrl mismatch: got ${bakedUrl} expected ${expectedUrl}`);
}
if (androidPackage !== 'app.vkara.tv') {
    fail(`android.package must be app.vkara.tv, got ${androidPackage}`);
}
if (bakedCleartext !== allowCleartext) {
    fail(`allowCleartext mismatch: got ${bakedCleartext} expected ${allowCleartext}`);
}

const appTsx = readFileSync(join(root, 'App.tsx'), 'utf8');
if (appTsx.includes('vkara.vercel.app')) {
    fail('App.tsx must not hardcode production host; use Constants.expoConfig.extra.vkaraTvUrl');
}

if (!existsSync(join(root, 'assets/tv-banner.png'))) {
    fail('missing assets/tv-banner.png (run bun run sync:assets)');
}
if (!existsSync(join(root, 'assets/icon.png'))) {
    fail('missing assets/icon.png (run bun run sync:assets)');
}

console.log(
    JSON.stringify(
        {
            ok: true,
            version: pkg.version,
            applicationId: 'app.vkara.tv',
            vkaraTvUrl: bakedUrl,
            allowCleartext: bakedCleartext,
            source: envUrl ? 'VKARA_TV_URL' : 'vkara.defaultTvUrl',
        },
        null,
        2,
    ),
);
