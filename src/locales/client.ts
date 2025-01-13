'use client';

import { createI18nClient } from 'next-international/client';
import en from './en';

export const { useI18n, useScopedI18n, I18nProviderClient } = createI18nClient(
    {
        en: () => import('./en'),
        vi: () => import('./vi'),
    },
    {
        basePath: '/',
        fallbackLocale: en,
        segmentName: 'locale',
    },
);
