import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * `bun build --compile --external playwright` leaves the package on disk.
 * A compiled API image that does not copy it fails TikTok search with
 * `Cannot find package 'playwright' from '/$bunfs/root/server'`.
 */
const COMPILED_API_DOCKERFILES = [
    'apps/api/Dockerfile',
    'containers/api-redis/Dockerfile',
    'containers/aio/Dockerfile',
];

describe('compiled API playwright runtime', () => {
    it('copies playwright and playwright-core next to the compiled server', () => {
        for (const file of COMPILED_API_DOCKERFILES) {
            const source = readFileSync(path.join(repoRoot, file), 'utf8');
            expect(source, file).toContain('dist/server');
            expect(source, file).toContain(
                'node_modules/.bun/playwright@*/node_modules/playwright',
            );
            expect(source, file).toContain(
                'node_modules/.bun/playwright-core@*/node_modules/playwright-core',
            );
            expect(source, file).toMatch(/COPY[^\n]*node_modules/);
        }
    });
});
