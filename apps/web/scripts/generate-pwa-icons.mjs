import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const OUT_DIR = 'public/icons';
const FAVICON_OUT = 'public/favicon.ico';

const COLORS = {
    bg0: '#020617',
    bg1: '#07111f',
    bg2: '#0b1220',

    cyan: '#38bdf8',
    cyanSoft: '#67e8f9',
    blue: '#2563eb',

    rose: '#e11d48',
    roseSoft: '#fb7185',

    white: '#e6f4ff',
};

const round = (n) => Number(n.toFixed(3));

function iconSvg(size, innerScale = 0.9) {
    const pad = size * (1 - innerScale) * 0.5;
    const u = size * innerScale;

    const X = (v) => round(pad + v * u);
    const Y = (v) => round(pad + v * u);
    const L = (v) => round(v * u);

    const radius = Math.round(size * 0.22);
    const detail = size >= 96;

    const thin = Math.max(1, L(0.008));
    const normal = Math.max(1.5, L(0.015));
    const strong = Math.max(3, L(0.05));

    const phoneUi = detail
        ? `
      <rect x="${X(0.183)}" y="${Y(0.618)}" width="${L(0.125)}" height="${L(0.011)}" rx="${L(0.006)}" fill="${COLORS.white}" opacity="0.12"/>
      <rect x="${X(0.18)}" y="${Y(0.672)}" width="${L(0.12)}" height="${L(0.012)}" rx="${L(0.006)}" fill="${COLORS.cyan}" opacity="0.34"/>
      <rect x="${X(0.18)}" y="${Y(0.702)}" width="${L(0.09)}" height="${L(0.012)}" rx="${L(0.006)}" fill="${COLORS.white}" opacity="0.15"/>
      <rect x="${X(0.18)}" y="${Y(0.732)}" width="${L(0.135)}" height="${L(0.012)}" rx="${L(0.006)}" fill="${COLORS.roseSoft}" opacity="0.95"/>

      <circle cx="${X(0.245)}" cy="${Y(0.805)}" r="${L(0.048)}" fill="${COLORS.rose}" fill-opacity="0.14" stroke="${COLORS.roseSoft}" stroke-width="${thin}"/>
      <path d="M ${X(0.232)} ${Y(0.781)} L ${X(0.232)} ${Y(0.829)} L ${X(0.274)} ${Y(0.805)} Z" fill="${COLORS.roseSoft}"/>

      <rect x="${X(0.168)}" y="${Y(0.858)}" width="${L(0.13)}" height="${L(0.012)}" rx="${L(0.006)}" fill="${COLORS.roseSoft}" opacity="0.9"/>
      <circle cx="${X(0.255)}" cy="${Y(0.864)}" r="${L(0.017)}" fill="${COLORS.roseSoft}"/>
    `
        : `
      <circle cx="${X(0.245)}" cy="${Y(0.805)}" r="${L(0.042)}" fill="${COLORS.rose}" fill-opacity="0.16" stroke="${COLORS.roseSoft}" stroke-width="${thin}"/>
      <path d="M ${X(0.234)} ${Y(0.785)} L ${X(0.234)} ${Y(0.825)} L ${X(0.269)} ${Y(0.805)} Z" fill="${COLORS.roseSoft}"/>
    `;

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="geometricPrecision">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.bg2}"/>
      <stop offset="52%" stop-color="${COLORS.bg0}"/>
      <stop offset="100%" stop-color="#00030a"/>
    </linearGradient>

    <radialGradient id="ambient" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${COLORS.cyan}" stop-opacity="0.18"/>
      <stop offset="58%" stop-color="${COLORS.blue}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${COLORS.bg0}" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="panelStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.cyanSoft}"/>
      <stop offset="55%" stop-color="${COLORS.cyan}"/>
      <stop offset="100%" stop-color="${COLORS.blue}"/>
    </linearGradient>

    <linearGradient id="screenFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a1728"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <linearGradient id="phoneFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1424"/>
      <stop offset="100%" stop-color="#030814"/>
    </linearGradient>

    <filter id="softShadow" x="-30%" y="-30%" width="170%" height="180%">
      <feDropShadow dx="0" dy="${L(0.022)}" stdDeviation="${L(0.024)}" flood-color="#000814" flood-opacity="0.5"/>
    </filter>

    <filter id="blueGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="${L(0.016)}" flood-color="${COLORS.cyan}" flood-opacity="0.38"/>
    </filter>
  </defs>

  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.44}" fill="url(#ambient)"/>

  <!-- TV -->
  <g filter="url(#softShadow)">
    <rect
      x="${X(0.19)}"
      y="${Y(0.2)}"
      width="${L(0.62)}"
      height="${L(0.42)}"
      rx="${L(0.065)}"
      fill="#050c18"
      stroke="url(#panelStroke)"
      stroke-width="${normal}"
    />
    <rect
      x="${X(0.215)}"
      y="${Y(0.225)}"
      width="${L(0.57)}"
      height="${L(0.37)}"
      rx="${L(0.04)}"
      fill="url(#screenFill)"
    />

    <rect
      x="${X(0.455)}"
      y="${Y(0.625)}"
      width="${L(0.09)}"
      height="${L(0.03)}"
      rx="${L(0.01)}"
      fill="${COLORS.cyan}"
      opacity="0.16"
    />
    <rect
      x="${X(0.405)}"
      y="${Y(0.655)}"
      width="${L(0.19)}"
      height="${L(0.02)}"
      rx="${L(0.01)}"
      fill="${COLORS.cyan}"
      opacity="0.18"
    />
  </g>

  <!-- V on screen -->
  <g filter="url(#blueGlow)">
    <path
      d="M ${X(0.355)} ${Y(0.29)} L ${X(0.5)} ${Y(0.53)} L ${X(0.645)} ${Y(0.29)}"
      fill="none"
      stroke="url(#panelStroke)"
      stroke-width="${strong}"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.95"
    />
    <path
      d="M ${X(0.39)} ${Y(0.315)} L ${X(0.5)} ${Y(0.495)} L ${X(0.61)} ${Y(0.315)}"
      fill="none"
      stroke="${COLORS.white}"
      stroke-width="${Math.max(1, L(0.008))}"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.2"
    />
  </g>

  <!-- Phone -->
  <g transform="rotate(-10 ${X(0.24)} ${Y(0.765)})" filter="url(#softShadow)">
    <rect
      x="${X(0.12)}"
      y="${Y(0.56)}"
      width="${L(0.24)}"
      height="${L(0.34)}"
      rx="${L(0.045)}"
      fill="url(#phoneFill)"
      stroke="url(#panelStroke)"
      stroke-width="${normal}"
    />
    ${phoneUi}
  </g>

  <!-- subtle outer rim -->
  <rect
    x="${size * 0.025}"
    y="${size * 0.025}"
    width="${size * 0.95}"
    height="${size * 0.95}"
    rx="${radius * 0.92}"
    fill="none"
    stroke="${COLORS.white}"
    stroke-opacity="0.07"
    stroke-width="${Math.max(1, size * 0.01)}"
  />
</svg>`;
}

function iconSharp(size, innerScale = 0.9) {
    return sharp(Buffer.from(iconSvg(size, innerScale))).resize(size, size);
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

async function renderPng(size, innerScale = 0.9) {
    return iconSharp(size, innerScale).png({
        quality: 100,
        compressionLevel: 9,
        adaptiveFiltering: true,
    }).toBuffer();
}

async function writeIcon(name, size, innerScale = 0.9) {
    await renderPng(size, innerScale).then((buffer) =>
        writeFile(`${OUT_DIR}/${name}`, buffer),
    );
}

async function writeFavicon() {
    const sizes = [16, 32, 48];
    const images = await Promise.all(
        sizes.map(async (size) => {
            const innerScale = size <= 16 ? 0.98 : 0.96;
            const buffer = await renderPng(size, innerScale);
            return { width: size, height: size, buffer };
        }),
    );

    await writeFile(FAVICON_OUT, encodeIco(images));
}

await mkdir(OUT_DIR, { recursive: true });

await writeFile(`${OUT_DIR}/vkara-icon.svg`, iconSvg(512, 0.9), 'utf8');

await writeIcon('icon-192.png', 192, 0.9);
await writeIcon('icon-512.png', 512, 0.9);
await writeIcon('apple-touch-icon.png', 180, 0.9);

// Larger safe area for Android maskable icons
await writeIcon('maskable-icon-512.png', 512, 0.8);

// Small favicon stays readable with TV + phone + V only
await writeIcon('icon-32.png', 32, 0.96);

await writeFavicon();

console.log(`VKara PWA icons generated in ${OUT_DIR}/ and ${FAVICON_OUT}`);
