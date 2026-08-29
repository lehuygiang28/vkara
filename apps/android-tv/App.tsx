import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Network from 'expo-network';
import { WebView, type WebViewNavigation } from 'react-native-webview';

const HANDOFF_TIMEOUT_MS = 30_000;

type Extra = {
    vkaraTvUrl?: string;
};

function getBakedBaseUrl(): string {
    const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
    const base = (extra.vkaraTvUrl ?? '').trim();
    if (!base) {
        throw new Error('Missing baked vkaraTvUrl in expo config extra');
    }
    return base;
}

function withLaunchParam(base: string): string {
    const hashIdx = base.indexOf('#');
    const beforeHash = hashIdx === -1 ? base : base.slice(0, hashIdx);
    const hash = hashIdx === -1 ? '' : base.slice(hashIdx);
    const sep = beforeHash.includes('?') ? '&' : '?';
    return `${beforeHash}${sep}launch=${Date.now()}${hash}`;
}

export default function App() {
    const webRef = useRef<WebView>(null);
    const bakedBase = useMemo(() => getBakedBaseUrl(), []);
    const allowedOrigin = useMemo(() => new URL(bakedBase).origin, [bakedBase]);

    const [url, setUrl] = useState<string | null>(null);
    const [handoffCommitted, setHandoffCommitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadGen = useRef(0);

    const clearTimeoutSafe = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const showError = useCallback(
        (message: string) => {
            clearTimeoutSafe();
            loadGen.current += 1;
            webRef.current?.stopLoading?.();
            setUrl(null);
            setError(message);
            setHandoffCommitted(false);
            setCanGoBack(false);
        },
        [clearTimeoutSafe],
    );

    const launch = useCallback(async () => {
        const gen = ++loadGen.current;
        setError(null);
        setHandoffCommitted(false);
        setCanGoBack(false);
        setUrl(null);
        webRef.current?.stopLoading?.();

        try {
            const state = await Network.getNetworkStateAsync();
            if (gen !== loadGen.current) return;
            if (!state.isConnected) {
                showError('No network connection. Check the TV internet connection.');
                return;
            }
        } catch {
            // Network API unavailable — still attempt load.
        }

        if (gen !== loadGen.current) return;

        clearTimeoutSafe();
        timeoutRef.current = setTimeout(() => {
            if (gen !== loadGen.current) return;
            showError('vkara is taking too long to load. Check the TV internet connection.');
        }, HANDOFF_TIMEOUT_MS);

        setUrl(withLaunchParam(bakedBase));
    }, [bakedBase, clearTimeoutSafe, showError]);

    useEffect(() => {
        void activateKeepAwakeAsync('vkara-tv-shell');
        void launch();
        return () => {
            clearTimeoutSafe();
            void deactivateKeepAwake('vkara-tv-shell');
        };
        // Intentionally once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!handoffCommitted || error) {
                BackHandler.exitApp();
                return true;
            }
            if (canGoBack && webRef.current) {
                webRef.current.goBack();
                return true;
            }
            BackHandler.exitApp();
            return true;
        });
        return () => sub.remove();
    }, [handoffCommitted, canGoBack, error]);

    const onShouldStartLoadWithRequest = useCallback(
        (req: { url: string }) => {
            try {
                const next = new URL(req.url);
                if (next.protocol !== 'http:' && next.protocol !== 'https:') {
                    return false;
                }
                return next.origin === allowedOrigin;
            } catch {
                return false;
            }
        },
        [allowedOrigin],
    );

    const onNavChange = useCallback(
        (nav: WebViewNavigation) => {
            if (error) return;
            setCanGoBack(nav.canGoBack);
            if (!handoffCommitted && !nav.loading && nav.url && !nav.url.startsWith('about:')) {
                setHandoffCommitted(true);
                clearTimeoutSafe();
                const ref = webRef.current as WebView & { clearHistory?: () => void };
                ref?.clearHistory?.();
            }
        },
        [handoffCommitted, clearTimeoutSafe, error],
    );

    return (
        <View style={styles.root}>
            <StatusBar hidden />
            {url ? (
                <WebView
                    ref={webRef}
                    source={{ uri: url }}
                    style={styles.webview}
                    onNavigationStateChange={onNavChange}
                    onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                    onError={() =>
                        showError('Failed to load vkara. Check the TV internet connection.')
                    }
                    onHttpError={() =>
                        showError('Failed to load vkara. Check the TV internet connection.')
                    }
                    javaScriptEnabled
                    domStorageEnabled
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback
                    setSupportMultipleWindows={false}
                />
            ) : (
                <View style={styles.webview} />
            )}

            {!handoffCommitted && !error ? (
                <View style={styles.overlay} pointerEvents="none">
                    <Text style={styles.brand}>VKara</Text>
                    <ActivityIndicator color="#e53e7d" size="large" style={styles.spinner} />
                    <Text style={styles.hint}>Loading karaoke…</Text>
                </View>
            ) : null}

            {error ? (
                <View style={styles.overlay}>
                    <Text style={styles.brand}>VKara</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable
                        onPress={() => {
                            void launch();
                        }}
                        style={styles.retryBtn}
                        focusable
                        hasTVPreferredFocus
                    >
                        <Text style={styles.retryLabel}>OK — Retry</Text>
                    </Pressable>
                    <Text style={styles.hint}>Press BACK to exit</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#020617',
    },
    webview: {
        flex: 1,
        backgroundColor: '#020617',
    },
    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: '#020617',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    brand: {
        color: '#f8fafc',
        fontSize: 48,
        fontWeight: '700',
        marginBottom: 24,
    },
    spinner: {
        marginVertical: 16,
    },
    hint: {
        color: '#94a3b8',
        fontSize: 18,
        marginTop: 16,
        textAlign: 'center',
    },
    errorText: {
        color: '#fda4af',
        fontSize: 22,
        textAlign: 'center',
        marginBottom: 28,
        maxWidth: 720,
    },
    retryBtn: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 8,
    },
    retryLabel: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
});
