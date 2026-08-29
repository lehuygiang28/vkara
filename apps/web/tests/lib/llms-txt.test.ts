import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('llms.txt for agents', () => {
    it('is published under public/ and served at /llms.txt', () => {
        const sitePath = path.join(webRoot, 'public/llms.txt');
        expect(existsSync(sitePath), sitePath).toBe(true);

        const site = readFileSync(sitePath, 'utf8');
        expect(site.startsWith('# vkara')).toBe(true);
        expect(site).toMatch(/^>/m);
        expect(site).toContain('roomId');
        expect(site).toContain('joinToken');
        expect(site).toContain('/url-commands');
        expect(site).toMatch(/scan QR|QR/i);
    });
});
