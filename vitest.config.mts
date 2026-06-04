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
                    name: '@vkara/youtube',
                    root: path.join(repoRoot, 'packages/youtube'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@src': path.join(repoRoot, 'packages/youtube/src'),
                    },
                },
            },
            {
                test: {
                    name: '@vkara/room',
                    root: path.join(repoRoot, 'packages/room'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@src': path.join(repoRoot, 'packages/room/src'),
                    },
                },
            },
            {
                test: {
                    name: '@vkara/personalization',
                    root: path.join(repoRoot, 'packages/personalization'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
                resolve: {
                    alias: {
                        '@src': path.join(repoRoot, 'packages/personalization/src'),
                    },
                },
            },
            {
                test: {
                    name: '@vkara/validators',
                    root: path.join(repoRoot, 'packages/validators'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
            },
            {
                test: {
                    name: '@vkara/env',
                    root: path.join(repoRoot, 'packages/env'),
                    include: ['tests/**/*.test.ts'],
                    environment: 'node',
                },
            },
            {
                test: {
                    name: '@vkara/cache-redis',
                    root: path.join(repoRoot, 'packages/cache-redis'),
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
