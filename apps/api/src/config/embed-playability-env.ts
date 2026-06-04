import { parseEnvFlag, parseEnvPositiveInt } from './env';

/** Canonical `VKARA_*` names for embed playability. */
export const VkaraEmbedEnv = {
    PREFILTER_AT_LIST: 'VKARA_EMBED_PREFILTER_AT_LIST',
    CACHE_TTL_SECONDS: 'VKARA_EMBED_CACHE_TTL_SECONDS',
} as const;

export const DEFAULT_EMBED_CACHE_TTL_SECONDS = 30 * 24 * 3600;

/** When enabled, search/related/playlist preview omit non-embeddable videos. Default: off. */
export function isEmbedPrefilterAtListEnabled(): boolean {
    return parseEnvFlag(VkaraEmbedEnv.PREFILTER_AT_LIST, false);
}

export function getEmbedCacheTtlSeconds(): number {
    return parseEnvPositiveInt(
        VkaraEmbedEnv.CACHE_TTL_SECONDS,
        DEFAULT_EMBED_CACHE_TTL_SECONDS,
    );
}
