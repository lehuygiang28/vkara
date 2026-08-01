import { readdir } from 'node:fs/promises';
import path from 'node:path';

/** Recursively collect files under `dir` whose names end with `ext`. */
export async function collectFiles(dir, ext) {
    const out = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...(await collectFiles(full, ext)));
        } else if (entry.name.endsWith(ext)) {
            out.push(full);
        }
    }
    return out;
}
