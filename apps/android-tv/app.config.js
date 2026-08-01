const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function readPkg() {
    return JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
}

function resolveTvUrl(defaultTvUrl) {
    const fromEnv = (process.env.VKARA_TV_URL ?? '').trim();
    const url = fromEnv || String(defaultTvUrl ?? '').trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error(
            'VKARA_TV_URL / vkara.defaultTvUrl must start with http:// or https://',
        );
    }
    if (url.includes("'") || url.includes('\n') || url.includes('\r')) {
        throw new Error('VKARA_TV_URL contains invalid characters');
    }
    return url;
}

/** @param {{ config: Record<string, unknown> }} ctx */
module.exports = ({ config }) => {
    const pkg = readPkg();
    const defaultTvUrl = pkg.vkara?.defaultTvUrl ?? '';
    const tvUrl = resolveTvUrl(defaultTvUrl);
    const allowCleartext = process.env.VKARA_ALLOW_CLEARTEXT === '1';
    const version = pkg.version ?? '0.0.1';
    const [maj = '0', min = '0', pat = '0'] = version.split('.');
    const versionCode =
        Number(maj) * 1_000_000 +
        Number(min) * 1000 +
        Number(String(pat).split('-')[0] ?? pat);

    return {
        ...config,
        name: 'vKara',
        slug: 'vkara-tv',
        version,
        orientation: 'landscape',
        icon: './assets/icon.png',
        userInterfaceStyle: 'dark',
        newArchEnabled: true,
        splash: {
            image: './assets/icon.png',
            resizeMode: 'contain',
            backgroundColor: '#020617',
        },
        android: {
            ...(typeof config.android === 'object' && config.android ? config.android : {}),
            package: 'app.vkara.tv',
            versionCode,
            adaptiveIcon: {
                foregroundImage: './assets/icon.png',
                backgroundColor: '#020617',
            },
            splash: {
                image: './assets/icon.png',
                resizeMode: 'contain',
                backgroundColor: '#020617',
            },
        },
        plugins: [
            [
                '@react-native-tvos/config-tv',
                {
                    isTV: true,
                    androidTVRequired: false,
                    androidTVBanner: './assets/tv-banner.png',
                },
            ],
            './plugins/withCleartext.js',
        ],
        extra: {
            vkaraTvUrl: tvUrl,
            allowCleartext,
            defaultTvUrl,
            eas: {
                // @lehuygiang28/vkara-tv — override with EAS_PROJECT_ID if needed.
                projectId:
                    process.env.EAS_PROJECT_ID ||
                    '2877c9a0-2a40-4bbf-a8d0-067d294e9f3d',
            },
        },
    };
};
