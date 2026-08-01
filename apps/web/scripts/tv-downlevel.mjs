/**
 * Post-build syntax downleveling for old Smart TV browsers.
 *
 * Samsung Tizen TVs run old Chromium builds; the supported baseline is
 * Tizen 6.0 / 2021 ≈ Chrome 76. Next.js only transpiles first-party code —
 * vendor chunks from node_modules (Sentry, framer-motion, React, …) can ship
 * newer syntax that is a SyntaxError there. One unparseable chunk means React
 * never mounts: black/white screen on the TV.
 *
 * This script rewrites every client chunk in `.next/static` with esbuild,
 * targeting TV_CHROME_TARGET. Runtime APIs (not syntax) are covered
 * separately by `public/tv-polyfills.js`.
 *
 * Runs as part of `bun run build` (see package.json). Skip with
 * TV_DOWNLEVEL=0.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { collectFiles } from './lib/collect-files.mjs';

const TARGET = process.env.TV_CHROME_TARGET || 'chrome76';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(webRoot, '.next', 'static');

if (process.env.TV_DOWNLEVEL === '0') {
    console.log('[tv-downlevel] TV_DOWNLEVEL=0 — skipped');
    process.exit(0);
}

if (!existsSync(staticDir)) {
    console.error(`[tv-downlevel] ${staticDir} not found — run \`next build\` first`);
    process.exit(1);
}

/**
 * Selector/value rewrites for engines without :is(), :where() and dvh units
 * (all ~Chrome 88+/108+). One unsupported selector invalidates the whole
 * rule on old engines, silently dropping styles — e.g. Tailwind's
 * `[hidden]:where(...)` preflight rule, without which `hidden` attributes
 * stop working. Only known-safe patterns are rewritten:
 *
 *   `X:is(.dark *)`         -> `.dark X`        (Tailwind dark: variants)
 *   `:where(simple)`        -> `simple`         (comma-free args only;
 *                                                loses zero-specificity,
 *                                                fine for preflight rules)
 *   `prop:...dvh...`        -> vh fallback declaration inserted before
 *   `inset: ...`            -> top/right/bottom/left longhands (the
 *                              shorthand is Chrome 87+; without this,
 *                              Tailwind's `inset-0` is dropped and every
 *                              absolute fullscreen container collapses
 *                              into the top-left corner)
 *   `:focus-visible`        -> `:focus` (86+; an unsupported selector
 *                              drops the whole rule)
 */
function downlevelCss(css) {
    let out = css.replace(/([^,{}\s][^,{}]*?):is\(\.dark \*\)/g, '.dark $1');
    // Comma-free args only (a comma would change semantics when unwrapped);
    // allows one nested paren group, e.g. `:where(:not([hidden=until-found]))`.
    out = out.replace(/:where\(((?:[^(),]|\([^()]*\))*)\)/g, '$1');
    out = out.replace(
        /([a-zA-Z-]+):([^;{}]*dvh[^;{}]*)/g,
        (m, prop, value) => `${prop}:${value.replace(/dvh/g, 'vh')};${prop}:${value}`,
    );
    // `[{;]` anchors to a property position so custom properties like
    // `--tw-ring-inset:inset` are left alone.
    out = out.replace(/([{;])inset:([^;{}]+)/g, (m, lead, value) => {
        const v = value.trim().split(/\s+/);
        if (v.length < 1 || v.length > 4) return m;
        const [top, right = top, bottom = top, left = right] = v;
        return `${lead}top:${top};right:${right};bottom:${bottom};left:${left}`;
    });
    out = out.replace(/:focus-visible/g, ':focus');
    return out;
}

const files = await collectFiles(staticDir, '.js');
let changed = 0;
let bytesBefore = 0;
let bytesAfter = 0;
const failures = [];

for (const file of files) {
    const source = await readFile(file, 'utf8');
    try {
        const result = await transform(source, {
            // Cap at es2019 alongside the browser target (esbuild applies the
            // most restrictive of the two per feature): Chrome 76 lacks
            // optional chaining / nullish (80+) and later class features.
            // tv-verify.mjs parses at ES2019 so this pair stays airtight
            // regardless of which vendor modules an environment bundles.
            target: [TARGET, 'es2019'],
            minify: true,
            // Chunks are plain scripts by the time webpack emits them.
            format: undefined,
            loader: 'js',
            charset: 'utf8',
        });
        if (result.code !== source) {
            await writeFile(file, result.code);
            changed++;
        }
        bytesBefore += source.length;
        bytesAfter += result.code.length;
    } catch (err) {
        failures.push({ file: path.relative(staticDir, file), message: err.message });
    }
}

if (failures.length > 0) {
    console.error(`[tv-downlevel] FAILED for ${failures.length}/${files.length} chunk(s):`);
    for (const f of failures) {
        console.error(`  - ${f.file}: ${f.message.split('\n')[0]}`);
    }
    process.exit(1);
}

const cssFiles = await collectFiles(staticDir, '.css');
let cssChanged = 0;
for (const file of cssFiles) {
    const source = await readFile(file, 'utf8');
    const rewritten = downlevelCss(source);
    if (rewritten !== source) {
        await writeFile(file, rewritten);
        cssChanged++;
    }
}

console.log(
    `[tv-downlevel] target=${TARGET}: rewrote ${changed}/${files.length} JS chunks ` +
        `(${(bytesBefore / 1024).toFixed(0)}KB -> ${(bytesAfter / 1024).toFixed(0)}KB), ` +
        `${cssChanged}/${cssFiles.length} CSS files`,
);
