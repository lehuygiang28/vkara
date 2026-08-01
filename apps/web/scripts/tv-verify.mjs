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
 *     silently drop whole rules on old engines);
 *   - TV layout source CSS dual-declares `clamp`/`min`/`max` (static
 *     fallback first) so Chrome 76 keeps usable sizes.
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

/**
 * Dual-declare policy: every `clamp`/`min`/`max` declaration must be preceded
 * by a static same-property declaration in the same rule body.
 */
function findUngatedCssMath(source, label) {
    const nocomment = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const found = [];
    const blocks = nocomment.split('{');
    for (let i = 1; i < blocks.length; i++) {
        const body = blocks[i].split('}', 1)[0];
        const last = new Map();
        const declRe = /([a-zA-Z_-][\w-]*)\s*:\s*([^;{}]+);/g;
        let m;
        while ((m = declRe.exec(body)) !== null) {
            const prop = m[1];
            const val = m[2].trim();
            const hasMath = /\b(clamp|min|max)\s*\(/.test(val);
            if (hasMath) {
                const prev = last.get(prop);
                if (prev === undefined || /\b(clamp|min|max)\s*\(/.test(prev)) {
                    found.push(`${label}: ungated ${prop}: ${val.slice(0, 72)}`);
                }
            }
            last.set(prop, val);
        }
    }
    return found;
}

const tvSourceCss = [
    path.join(webRoot, 'src/app/tv-tokens.css'),
    path.join(webRoot, 'src/app/tv-root-scale.css'),
];
for (const file of tvSourceCss) {
    if (!existsSync(file)) {
        problems.push(`missing TV CSS source: ${path.relative(webRoot, file)}`);
        continue;
    }
    const source = await readFile(file, 'utf8');
    problems.push(...findUngatedCssMath(source, path.relative(webRoot, file)));
}

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
        `${cssFiles.length} CSS files clean, TV dual-declare OK`,
);
