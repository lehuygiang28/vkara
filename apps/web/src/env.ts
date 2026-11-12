import { createEnv } from '@t3-oss/env-nextjs';
import { envSkipValidation, webPublicEnv, webServerEnv } from '@vkara/env';

export const env = createEnv({
    extends: [webPublicEnv(), webServerEnv()],
    runtimeEnv: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_TIKTOK_API_URL: process.env.NEXT_PUBLIC_TIKTOK_API_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN:
            process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
        NEXT_PUBLIC_VKARA_EXPERIMENTS: process.env.NEXT_PUBLIC_VKARA_EXPERIMENTS,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
        NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
        NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE:
            process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
        NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE:
            process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
        NEXT_PUBLIC_SENTRY_ENABLED: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
        WHISPER_URL: process.env.WHISPER_URL,
        HF_TOKEN: process.env.HF_TOKEN,
        VKARA_AIO: process.env.VKARA_AIO,
        GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
        ANALYZE: process.env.ANALYZE,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        SENTRY_DSN: process.env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
        SENTRY_RELEASE: process.env.SENTRY_RELEASE,
        SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
        SENTRY_ENABLED: process.env.SENTRY_ENABLED,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
        SENTRY_ORG: process.env.SENTRY_ORG,
        SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    },
    emptyStringAsUndefined: true,
    skipValidation: envSkipValidation(),
});
