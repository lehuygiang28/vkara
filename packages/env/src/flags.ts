export type FlagScope = 'api' | 'web' | 'both';

export type FlagDoc = {
    name: string;
    default: string | boolean | number;
    scope: FlagScope;
    description: string;
};

/** Canonical `VKARA_*` feature flags — keep in sync with zod schemas and `.env.example`. */
export const FLAG_DOCS = [
    {
        name: 'VKARA_EMBED_PREFILTER_AT_LIST',
        default: false,
        scope: 'api',
        description:
            'When enabled, filter non-embeddable videos from search/related/playlist preview lists.',
    },
    {
        name: 'VKARA_AIO',
        default: false,
        scope: 'web',
        description: 'All-in-one deploy: skip /vi redirect middleware when set to 1.',
    },
] as const satisfies readonly FlagDoc[];

export const VkaraEmbedEnv = {
    PREFILTER_AT_LIST: 'VKARA_EMBED_PREFILTER_AT_LIST',
    CACHE_TTL_SECONDS: 'VKARA_EMBED_CACHE_TTL_SECONDS',
} as const;
