import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        projects: [
            {
                test: {
                    name: '@vkara/api',
                    root: path.join(repoRoot, 'apps/api'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: [
                        {
                            find: '@/redis',
                            replacement: path.join(repoRoot, 'apps/api/tests/mocks/redis.ts'),
                        },
                        {
                            find: '@',
                            replacement: path.join(repoRoot, 'apps/api/src'),
                        },
                    ],
                },
            },
            {
                test: {
                    name: '@vkara/web',
                    root: path.join(repoRoot, 'apps/web'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@': path.join(repoRoot, 'apps/web/src'),
                    },
                },
            },
            {
                test: {
                    name: '@vkara/shared-utils',
                    root: path.join(repoRoot, 'packages/shared-utils'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@src': path.join(repoRoot, 'packages/shared-utils/src'),
                    },
                },
            },
            {
                test: {
                    name: '@vkara/shared-types',
                    root: path.join(repoRoot, 'packages/shared-types'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
            },
            {
                test: {
                    name: '@vkara/curated-playlists',
                    root: path.join(repoRoot, 'packages/curated-playlists'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@src': path.join(repoRoot, 'packages/curated-playlists/src'),
                    },
                },
            },
        ],
    },
});
