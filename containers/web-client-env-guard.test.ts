import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Regression guard for https://github.com/lehuygiang28/vkara/issues/12 —
 * client bundles must not fall back to server-only t3-env fields (VKARA_EXPERIMENTS).
 */
describe('web client t3-env guards', () => {
    it('isExperimentsEnabledOnWeb does not fall back to VKARA_EXPERIMENTS', () => {
        const source = readFileSync(
            path.join(repoRoot, 'packages/env/src/experiments.ts'),
            'utf8',
        );
        expect(source).not.toMatch(/return\s+isExperimentsEnabled\s*\(\s*env\s*\)/);
    });

    it('web env runtime does not expose VKARA_EXPERIMENTS to the Next client schema', () => {
        const source = readFileSync(path.join(repoRoot, 'apps/web/src/env.ts'), 'utf8');
        expect(source).not.toMatch(/\bVKARA_EXPERIMENTS:\s*process\.env/);
        expect(source).not.toContain('experimentsEnv()');
    });

    it('AIO image build bakes NEXT_PUBLIC_VKARA_EXPERIMENTS for client bundles', () => {
        const dockerfile = readFileSync(
            path.join(repoRoot, 'containers/aio/Dockerfile'),
            'utf8',
        );
        expect(dockerfile).toMatch(/ARG NEXT_PUBLIC_VKARA_EXPERIMENTS=false/);
        expect(dockerfile).toMatch(/ENV NEXT_PUBLIC_VKARA_EXPERIMENTS=\$\{NEXT_PUBLIC_VKARA_EXPERIMENTS\}/);
    });

    it('standalone web image forwards NEXT_PUBLIC_VKARA_EXPERIMENTS into next build', () => {
        const dockerfile = readFileSync(path.join(repoRoot, 'apps/web/Dockerfile'), 'utf8');
        expect(dockerfile).toMatch(/ARG NEXT_PUBLIC_VKARA_EXPERIMENTS=false/);
        expect(dockerfile).toMatch(/ENV NEXT_PUBLIC_VKARA_EXPERIMENTS=\$\{NEXT_PUBLIC_VKARA_EXPERIMENTS\}/);
    });
});
