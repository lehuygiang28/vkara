'use client';

import { createI18nClient } from 'next-international/client';
import vi from './vi';

export const { useI18n, useScopedI18n, I18nProviderClient, useCurrentLocale } =
    createI18nClient(
        {
            vi: () => import('./vi'),
            en: () => import('./en'),
        },
        {
            fallbackLocale: vi,
            segmentName: 'locale',
        },
    );

export type SUPPORTED_LOCALES = 'vi' | 'en';
