import { createEnv } from '@t3-oss/env-nextjs';
import { envSkipValidation, webPublicEnv, webServerEnv } from '@vkara/env';

export const env = createEnv({
    extends: [webPublicEnv(), webServerEnv()],
    runtimeEnv: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
        NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN:
            process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN,
        WHISPER_URL: process.env.WHISPER_URL,
        HF_TOKEN: process.env.HF_TOKEN,
        VKARA_AIO: process.env.VKARA_AIO,
        GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
        ANALYZE: process.env.ANALYZE,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
    },
    emptyStringAsUndefined: true,
    skipValidation: envSkipValidation(),
});
