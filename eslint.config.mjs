import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(repoRoot, 'apps/web');

const compat = new FlatCompat({
    baseDirectory: webRoot,
});

export const sharedLegacyImports = {
    paths: [
        {
            name: '@vkara/shared-types',
            message: 'Use @vkara/youtube, @vkara/room, or @vkara/validators.',
        },
        {
            name: '@vkara/shared-utils',
            message: 'Use @vkara/youtube, @vkara/room, or @vkara/personalization.',
        },
        {
            name: '@vkara/shared-infra',
            message: 'Use @vkara/redis.',
        },
    ],
    patterns: [
        {
            group: ['@vkara/shared-*'],
            message: 'Legacy shared-* packages were removed from the monorepo.',
        },
    ],
};

/** @param {string} [fileRoot] Path prefix for globs (`apps/web` from repo root, `` from apps/web). */
export function createWebEslintConfigs(fileRoot = 'apps/web') {
    const prefix = fileRoot ? `${fileRoot.replace(/\/$/, '')}/` : '';

    return [
        ...compat.extends('next/core-web-vitals', 'next/typescript').map((config) => ({
            ...config,
            files: [`${prefix}**/*.{ts,tsx}`],
        })),
        {
            files: [`${prefix}next.config.ts`],
            rules: {
                '@typescript-eslint/no-require-imports': 'off',
            },
        },
        {
            files: [`${prefix}**/*.{ts,tsx}`],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        ...sharedLegacyImports,
                        patterns: [
                            ...sharedLegacyImports.patterns,
                            {
                                group: ['../../api/**', '../api/**', '@/../api/**'],
                                message:
                                    'Do not import from apps/api. Move shared code to packages/*.',
                            },
                        ],
                    },
                ],
            },
        },
    ];
}

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/**',
            '**/.next/**',
            '**/dist/**',
            '**/coverage/**',
            '**/.turbo/**',
            '**/bun.lock',
            'openspec/**',
            'apps/web/next-env.d.ts',
            'apps/web/.next/**',
        ],
    },
    {
        files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-restricted-imports': ['error', sharedLegacyImports],
        },
    },
    {
        files: ['packages/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    ...sharedLegacyImports,
                    patterns: [
                        ...sharedLegacyImports.patterns,
                        {
                            group: ['../../apps/**', '../../../apps/**', '@/../apps/**'],
                            message: 'Packages must not import from apps/. Move shared code to packages/*.',
                        },
                    ],
                },
            ],
        },
    },
    ...createWebEslintConfigs('apps/web'),
);
