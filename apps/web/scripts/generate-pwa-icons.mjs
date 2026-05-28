import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const BRAND = '#e11d48';
const BG = '#0a0a0f';

function iconSvg(size, innerScale = 0.55) {
    const r = Math.round(size * innerScale * 0.22);
    const cx = size / 2;
    const cy = size / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 2.2}" fill="${BRAND}" opacity="0.2"/>
  <text x="${cx}" y="${cy + r * 0.35}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${r * 2}" font-weight="700" fill="${BRAND}">V</text>
</svg>`;
}

async function writeIcon(name, size, innerScale = 0.55) {
    const svg = iconSvg(size, innerScale);
    await sharp(Buffer.from(svg)).png().toFile(`public/icons/${name}`);
}

await mkdir('public/icons', { recursive: true });
await writeIcon('icon-192.png', 192);
await writeIcon('icon-512.png', 512);
await writeIcon('apple-touch-icon.png', 180);
await writeIcon('maskable-icon-512.png', 512, 0.48);
await writeIcon('icon-32.png', 32);
console.log('PWA icons generated in public/icons/');
