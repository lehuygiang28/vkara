/**
 * When VKARA_ALLOW_CLEARTEXT=1, permit cleartext HTTP for LAN self-host.
 * Official/default builds leave cleartext disabled.
 *
 * Resolves @expo/config-plugins via expo package (Bun nested installs).
 */
function loadConfigPlugins() {
    const Module = require('node:module');
    const createRequire = Module.createRequire || Module.createRequireFromPath;
    const req = createRequire(__filename);
    try {
        return req('@expo/config-plugins');
    } catch {
        const expoPkg = req.resolve('expo/package.json');
        const fromExpo = createRequire(expoPkg);
        return fromExpo('@expo/config-plugins');
    }
}

const { AndroidConfig, withAndroidManifest, createRunOncePlugin } =
    loadConfigPlugins();

function withCleartext(config) {
    const allow = process.env.VKARA_ALLOW_CLEARTEXT === '1';
    return withAndroidManifest(config, (cfg) => {
        const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
        app.$ = app.$ ?? {};
        app.$['android:usesCleartextTraffic'] = allow ? 'true' : 'false';
        return cfg;
    });
}

module.exports = createRunOncePlugin(withCleartext, 'vkara-with-cleartext', '1.0.0');
