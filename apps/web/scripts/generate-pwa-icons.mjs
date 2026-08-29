import sharp from 'sharp';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const repoRoot = join(webRoot, '../..');
const BRAND_DIR = join(webRoot, 'brand');
const OUT_DIR = join(webRoot, 'public/icons');
const FAVICON_OUT = join(webRoot, 'public/favicon.ico');
const OG_OUT = join(webRoot, 'public/og-image.png');

const SHEET = join(BRAND_DIR, 'sheet-source.png');
const LOCKUP_WIDE = join(BRAND_DIR, 'lockup-source.png');

const BG = { r: 5, g: 3, b: 10 };
const BG_HEX = '#05030a';

async function contentBounds(input, { minLum = 28, minX = 0, maxX = Infinity } = {}) {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: c } = info;
    const right = Math.min(w - 1, maxX);
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    const colBright = new Array(w).fill(0);
    const rowBright = new Array(h).fill(0);

    for (let y = 0; y < h; y++) {
        for (let x = minX; x <= right; x++) {
            const i = (y * w + x) * c;
            if (data[i + 3] < 20) continue;
            if (data[i] + data[i + 1] + data[i + 2] <= minLum) continue;
            if (x < x0) x0 = x;
            if (y < y0) y0 = y;
            if (x > x1) x1 = x;
            if (y > y1) y1 = y;
            colBright[x]++;
            rowBright[y]++;
        }
    }

    if (nEmpty(x0, y0, x1, y1)) {
        throw new Error('no bright pixels in region');
    }

    return { w, h, x0, y0, x1, y1, width: x1 - x0 + 1, height: y1 - y0 + 1, colBright, rowBright };
}

function nEmpty(x0, y0, x1, y1) {
    return x1 < x0 || y1 < y0;
}

function largestInnerGap(counts, from, to, minRun = 24) {
    let best = null;
    let dark = false;
    let start = from;
    for (let i = from; i <= to; i++) {
        const isDark = counts[i] < 8;
        if (isDark && !dark) {
            dark = true;
            start = i;
        }
        if (!isDark && dark) {
            const run = { x0: start, x1: i - 1, w: i - start };
            if (run.w >= minRun && (!best || run.w > best.w)) best = run;
            dark = false;
        }
    }
    if (dark) {
        const run = { x0: start, x1: to, w: to - start + 1 };
        if (run.w >= minRun && (!best || run.w > best.w)) best = run;
    }
    return best;
}

async function extractBox(input, box) {
    return sharp(input)
        .extract({ left: box.x0, top: box.y0, width: box.width, height: box.height })
        .png()
        .toBuffer();
}

function encodeIco(images) {
    const count = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);

    const entries = [];
    let dataOffset = 6 + count * 16;

    for (const { width, height, buffer } of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(width >= 256 ? 0 : width, 0);
        entry.writeUInt8(height >= 256 ? 0 : height, 1);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(buffer.length, 8);
        entry.writeUInt32LE(dataOffset, 12);
        entries.push(entry);
        dataOffset += buffer.length;
    }

    return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}

async function roundedTile(size, inner, left, top) {
    const radius = Math.round(size * 0.22);
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG_HEX}"/>
</svg>`);
    return sharp(svg)
        .composite([{ input: inner, left, top }])
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
}

/** Square app icon: mark contained in the inner safe area. */
async function renderIcon(markBuf, size, innerScale) {
    const pad = Math.round((size * (1 - innerScale)) / 2);
    const inner = Math.max(1, size - pad * 2);
    const fitted = await sharp(markBuf)
        .resize(inner, inner, {
            fit: 'contain',
            background: BG,
        })
        .png()
        .toBuffer();
    return roundedTile(size, fitted, pad, pad);
}

async function fitOnCanvas(srcBuf, width, height, { maxW = 0.86, maxH = 0.62 } = {}) {
    const fitted = await sharp(srcBuf)
        .resize(Math.round(width * maxW), Math.round(height * maxH), { fit: 'inside' })
        .png()
        .toBuffer();
    const meta = await sharp(fitted).metadata();
    const left = Math.round((width - meta.width) / 2);
    const top = Math.round((height - meta.height) / 2);
    return sharp({
        create: { width, height, channels: 3, background: BG },
    })
        .composite([{ input: fitted, left, top }])
        .png({ quality: 100, compressionLevel: 9 })
        .toBuffer();
}

const sheetBounds = await contentBounds(SHEET);
const gap = largestInnerGap(sheetBounds.colBright, sheetBounds.x0, sheetBounds.x1, 40);
if (!gap) throw new Error('could not split sheet into mark + lockup');

const markBox = await contentBounds(SHEET, { maxX: gap.x0 - 1 });
const sheetLockupBox = await contentBounds(SHEET, { minX: gap.x1 + 1 });
const wideLockupBox = await contentBounds(LOCKUP_WIDE);

const markBuf = await extractBox(SHEET, markBox);
const lockupBuf = await extractBox(LOCKUP_WIDE, wideLockupBox);

const taglineGap = largestInnerGap(sheetLockupBox.rowBright, sheetLockupBox.y0, sheetLockupBox.y1, 16);
const wordmarkHeight = taglineGap ? taglineGap.x0 - sheetLockupBox.y0 : sheetLockupBox.height;
const wordmarkBuf = await extractBox(SHEET, {
    x0: sheetLockupBox.x0,
    y0: sheetLockupBox.y0,
    width: sheetLockupBox.width,
    height: wordmarkHeight,
});

await mkdir(BRAND_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(BRAND_DIR, 'mark.png'), markBuf);
await writeFile(join(BRAND_DIR, 'lockup.png'), lockupBuf);
await writeFile(join(BRAND_DIR, 'wordmark.png'), wordmarkBuf);

const icons = [
    ['icon-512.png', 512, 0.9],
    ['icon-192.png', 192, 0.9],
    ['apple-touch-icon.png', 180, 0.9],
    ['maskable-icon-512.png', 512, 0.8],
    ['icon-32.png', 32, 0.94],
];

for (const [name, size, scale] of icons) {
    await writeFile(join(OUT_DIR, name), await renderIcon(markBuf, size, scale));
}

const faviconSizes = [16, 32, 48];
const faviconImages = await Promise.all(
    faviconSizes.map(async (size) => ({
        width: size,
        height: size,
        buffer: await renderIcon(markBuf, size, size <= 16 ? 0.98 : 0.94),
    })),
);
await writeFile(FAVICON_OUT, encodeIco(faviconImages));

const iconSvgB64 = (await renderIcon(markBuf, 256, 0.9)).toString('base64');
await writeFile(
    join(OUT_DIR, 'vkara-icon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <image href="data:image/png;base64,${iconSvgB64}" width="512" height="512"/>
</svg>`,
    'utf8',
);

await writeFile(OG_OUT, await fitOnCanvas(lockupBuf, 1200, 630, { maxW: 0.88, maxH: 0.58 }));
await writeFile(
    join(OUT_DIR, 'tv-banner-320x180.png'),
    await fitOnCanvas(wordmarkBuf, 320, 180, { maxW: 0.9, maxH: 0.72 }),
);

const copies = [
    [join(OUT_DIR, 'icon-512.png'), join(repoRoot, 'apps/tizen/src/icon.png')],
    [join(OUT_DIR, 'icon-512.png'), join(repoRoot, 'apps/android-tv/assets/icon.png')],
    [join(OUT_DIR, 'tv-banner-320x180.png'), join(repoRoot, 'apps/android-tv/assets/tv-banner.png')],
];
for (const [from, to] of copies) {
    await copyFile(from, to);
}

console.log(`VKara assets from brand masters → ${OUT_DIR}/`);
console.log(`OG ${OG_OUT}`);
console.log('Synced Tizen icon + Android TV icon/banner');
