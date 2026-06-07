import type { VideoSource } from '@vkara/youtube';

type BrandPalette = {
    light: string;
    dark: string;
    /** Icon opacity when selected. */
    activeOpacity: number;
    /** Icon opacity when not selected. */
    inactiveOpacity: number;
    borderActiveAlpha: number;
    borderInactiveAlpha: number;
    surfaceActiveAlpha: number;
    surfaceInactiveAlpha: number;
    badgeActiveAlpha: number;
    badgeInactiveAlpha: number;
    /** Checkmark pill when selected (must contrast with check icon). */
    checkBackground: { light: string; dark: string };
};

/** Brand-tuned colors for settings tiles (softened for dark UI where needed). */
export const VIDEO_PROVIDER_BRAND: Record<VideoSource, BrandPalette> = {
    youtube: {
        light: '#FF0000',
        dark: '#FF0000',
        activeOpacity: 1,
        inactiveOpacity: 0.42,
        borderActiveAlpha: 0.48,
        borderInactiveAlpha: 0.16,
        surfaceActiveAlpha: 0.1,
        surfaceInactiveAlpha: 0.04,
        badgeActiveAlpha: 0.16,
        badgeInactiveAlpha: 0.08,
        checkBackground: { light: '#FF0000', dark: '#FF0000' },
    },
    tiktok: {
        light: '#010101',
        // Soft zinc on dark panels - avoids pure white glare while staying on-brand.
        dark: '#C4C4CC',
        activeOpacity: 0.82,
        inactiveOpacity: 0.38,
        borderActiveAlpha: 0.22,
        borderInactiveAlpha: 0.1,
        surfaceActiveAlpha: 0.06,
        surfaceInactiveAlpha: 0.03,
        badgeActiveAlpha: 0.1,
        badgeInactiveAlpha: 0.06,
        checkBackground: { light: '#010101', dark: '#52525B' },
    },
};

function resolveBrandHex(provider: VideoSource, prefersDark: boolean): string {
    const palette = VIDEO_PROVIDER_BRAND[provider];
    return prefersDark ? palette.dark : palette.light;
}

export function videoProviderBrandStyle({
    provider,
    active,
    prefersDark,
}: {
    provider: VideoSource;
    active: boolean;
    prefersDark: boolean;
}): { color: string; opacity: number } {
    const palette = VIDEO_PROVIDER_BRAND[provider];
    return {
        color: resolveBrandHex(provider, prefersDark),
        opacity: active ? palette.activeOpacity : palette.inactiveOpacity,
    };
}

export function videoProviderBrandRgba({
    provider,
    prefersDark,
    alpha,
}: {
    provider: VideoSource;
    prefersDark: boolean;
    alpha: number;
}): string {
    const hex = resolveBrandHex(provider, prefersDark);
    const normalized = hex.replace('#', '');
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function videoProviderSurfaceColors({
    provider,
    active,
    prefersDark,
}: {
    provider: VideoSource;
    active: boolean;
    prefersDark: boolean;
}) {
    const palette = VIDEO_PROVIDER_BRAND[provider];
    return {
        border: videoProviderBrandRgba({
            provider,
            prefersDark,
            alpha: active ? palette.borderActiveAlpha : palette.borderInactiveAlpha,
        }),
        surface: videoProviderBrandRgba({
            provider,
            prefersDark,
            alpha: active ? palette.surfaceActiveAlpha : palette.surfaceInactiveAlpha,
        }),
        badge: videoProviderBrandRgba({
            provider,
            prefersDark,
            alpha: active ? palette.badgeActiveAlpha : palette.badgeInactiveAlpha,
        }),
        badgeRing: videoProviderBrandRgba({
            provider,
            prefersDark,
            alpha: active ? palette.borderActiveAlpha * 0.55 : palette.borderInactiveAlpha,
        }),
        checkBackground: prefersDark ? palette.checkBackground.dark : palette.checkBackground.light,
    };
}
