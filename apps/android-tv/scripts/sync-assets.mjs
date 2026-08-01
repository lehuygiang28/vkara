#!/usr/bin/env node
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const repoRoot = join(root, '../..');
const require = createRequire(import.meta.url);

const iconSrc = join(repoRoot, 'apps/web/public/icons/icon-512.png');
const webBanner = join(repoRoot, 'apps/web/public/icons/tv-banner-320x180.png');
const outDir = join(root, 'assets');
const iconOut = join(outDir, 'icon.png');
const bannerOut = join(outDir, 'tv-banner.png');

async function exists(p) {
    try {
        await access(p);
        return true;
    } catch {
        return false;
    }
}

await mkdir(outDir, { recursive: true });
await copyFile(iconSrc, iconOut);

if (await exists(webBanner)) {
    await copyFile(webBanner, bannerOut);
    console.log(`synced banner from ${webBanner}`);
} else {
    let sharp;
    try {
        sharp = require(join(repoRoot, 'node_modules/sharp'));
    } catch {
        sharp = require(join(repoRoot, 'apps/web/node_modules/sharp'));
    }
    const size = Math.round(180 * 0.72);
    const left = Math.round((320 - size) / 2);
    const top = Math.round((180 - size) / 2);
    await sharp({
        create: {
            width: 320,
            height: 180,
            channels: 3,
            background: { r: 2, g: 6, b: 23 },
        },
    })
        .composite([
            {
                input: await sharp(iconSrc).resize(size, size).png().toBuffer(),
                left,
                top,
            },
        ])
        .png()
        .toFile(bannerOut);
    console.log(`generated ${bannerOut}`);
}

console.log(`synced ${iconOut}`);
