/**
 * vKara TV wrapper — navigates top-level to the hosted vkara TV app.
 *
 * Why top-level navigation instead of an iframe: the app must run in exactly
 * the same context as the TV's built-in browser (which is known to work).
 * Inside a Tizen widget, a cross-origin iframe gets third-party restrictions
 * the browser doesn't have — storage access (localStorage/cookies) can throw
 * and kill the app at boot, leaving a white frame.
 *
 * Screensaver-off and media-key registration are applied BEFORE navigating:
 * both are app-level settings on Tizen and survive the page hand-off.
 * The trade-off: once navigated, this wrapper's JS is gone, so in-app BACK
 * handling belongs to the site (with no history, BACK exits the app).
 */
'use strict';

// Replaced at stage time from VKARA_TV_URL or package.json vkara.defaultTvUrl.
// Committed source must keep this exact placeholder — do not hardcode a host here.
var APP_URL = '__VKARA_TV_URL__';
var HANDOFF_TIMEOUT_MS = 30000;

// Tizen TV remote keycodes
var KEY_RETURN = 10009;
var KEY_ENTER = 13;

var splash = document.getElementById('splash');
var errorOverlay = document.getElementById('error');
var errorMessage = document.getElementById('error-message');
var uaBadge = document.getElementById('ua');

var handoffTimer = null;

uaBadge.textContent = navigator.userAgent;

/* ---------- Samsung TV integration (no-ops in desktop browsers) ---------- */

function keepScreenOn() {
    try {
        webapis.appcommon.setScreenSaver(
            webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF
        );
    } catch (e) {
        // webapis unavailable (desktop browser) or privilege denied — non-fatal.
    }
}

function registerMediaKeys() {
    try {
        ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop',
         'MediaTrackNext', 'MediaTrackPrevious'].forEach(function (key) {
            try { tizen.tvinputdevice.registerKey(key); } catch (e) { /* per-key failure ok */ }
        });
    } catch (e) {
        // tizen API unavailable (desktop browser) — non-fatal.
    }
}

function exitApp() {
    try {
        tizen.application.getCurrentApplication().exit();
    } catch (e) {
        window.close();
    }
}

/* ---------- Hand-off / error state ---------- */

function showError(message) {
    clearTimeout(handoffTimer);
    errorMessage.textContent = message + ' Check the TV\'s internet connection.';
    splash.classList.add('hidden');
    errorOverlay.classList.remove('hidden');
}

function launch() {
    if (!navigator.onLine) {
        showError('No network connection.');
        return;
    }
    splash.classList.remove('hidden');
    errorOverlay.classList.add('hidden');

    // If navigation never commits (DNS/TLS failure keeps us on this page),
    // surface the error UI so OK-to-retry works.
    clearTimeout(handoffTimer);
    handoffTimer = setTimeout(function () {
        showError('vkara is taking too long to load.');
    }, HANDOFF_TIMEOUT_MS);

    // Cache-bust the HTML document: the Tizen app's private browser cache
    // survives app restarts and the old engine won't reliably revalidate,
    // so without this a web redeploy doesn't show up until the app is
    // reinstalled (which wipes that cache). Hashed /_next/static assets
    // keep caching normally, so launches stay fast.
    var url = APP_URL + (APP_URL.indexOf('?') === -1 ? '?' : '&') + 'launch=' + Date.now();

    // replace() keeps history length at 1, so BACK on the remote exits the
    // app instead of returning to this splash page.
    window.location.replace(url);
}

/* ---------- Remote key handling (only while this page is showing) ---------- */

document.addEventListener('keydown', function (event) {
    if (event.keyCode === KEY_RETURN) {
        event.preventDefault();
        exitApp();
    } else if (event.keyCode === KEY_ENTER &&
               !errorOverlay.classList.contains('hidden')) {
        event.preventDefault();
        launch();
    }
});

window.addEventListener('online', launch);

/* ---------- Boot ---------- */

keepScreenOn();
registerMediaKeys();
launch();
