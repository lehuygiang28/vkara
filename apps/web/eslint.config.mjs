import path from 'node:path';
import { fileURLToPath } from 'node:url';

import nextPlugin from '@next/eslint-plugin-next';

import { createWebEslintConfigs } from '../../eslint.config.mjs';

const webRoot = path.dirname(fileURLToPath(import.meta.url));

// Next build checks this file for `@next/next`; sources use createWebEslintConfigs (ts/tsx only).
const webEslintConfig = [
    {
        files: ['eslint.config.mjs'],
        plugins: {
            '@next/next': nextPlugin,
        },
        // Next build iterates `rules` when detecting the plugin; must be an object.
        rules: {},
    },
    {
        ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**'],
    },
    ...createWebEslintConfigs(''),
    {
        files: ['**/*.{ts,tsx}'],
        settings: {
            next: {
                rootDir: webRoot,
            },
        },
    },
];

export default webEslintConfig;
