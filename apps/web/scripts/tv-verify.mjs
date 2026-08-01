/**
 * Independent old-browser compatibility check for the built client bundle.
 *
 * Complements scripts/tv-downlevel.mjs (which rewrites the output) by
 * verifying with a different tool that the result actually holds:
 *   - every JS chunk in .next/static parses at ES2019 using acorn — the
 *     downlevel pass caps its output at es2019 precisely so this check is
 *     airtight for the Tizen 6.0 / 2021 baseline (~Chrome 76);
 *   - no CSS file still contains `:is(`, `:where(`, ungated `dvh`,
 *     `inset:` shorthand, or `:focus-visible` (unsupported selectors
 *     silently drop whole rules on old engines).
 *
 * Run after a build: `bun scripts/tv-verify.mjs`
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import { collectFiles } from './lib/collect-files.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(webRoot, '.next', 'static');

if (!existsSync(staticDir)) {
    console.error(`[tv-verify] ${staticDir} not found — run \`bun run build\` first`);
    process.exit(1);
}

const problems = [];

const jsFiles = await collectFiles(staticDir, '.js');
for (const file of jsFiles) {
    const source = await readFile(file, 'utf8');
    try {
        acorn.parse(source, { ecmaVersion: 2019 });
    } catch (err) {
        problems.push(`${path.relative(staticDir, file)}: ${err.message}`);
    }
}

const cssFiles = await collectFiles(staticDir, '.css');
for (const file of cssFiles) {
    const source = await readFile(file, 'utf8');
    // `inset:` shorthand (Chrome 87+) must have been expanded to longhands.
    const insetMatches = source.match(/[{;]inset:/g);
    if (insetMatches) {
        problems.push(
            `${path.relative(staticDir, file)}: contains inset: shorthand (${insetMatches.length}x)`,
        );
    }
    for (const token of [':is(', ':where(', 'dvh', ':focus-visible']) {
        if (token === 'dvh') {
            // Only flag dvh values that have no vh fallback right before them.
            const re = /([a-zA-Z-]+):([^;{}]*dvh[^;{}]*)/g;
            let m;
            while ((m = re.exec(source)) !== null) {
                const fallback = `${m[1]}:${m[2].replace(/dvh/g, 'vh')};`;
                if (!source.includes(fallback)) {
                    problems.push(
                        `${path.relative(staticDir, file)}: dvh without vh fallback (${m[0]})`,
                    );
                }
            }
        } else if (source.includes(token)) {
            problems.push(`${path.relative(staticDir, file)}: contains ${token})`);
        }
    }
}

if (problems.length > 0) {
    console.error(`[tv-verify] FAILED — ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}

console.log(
    `[tv-verify] OK — ${jsFiles.length} JS chunks parse at ES2019, ` +
        `${cssFiles.length} CSS files clean`,
);
