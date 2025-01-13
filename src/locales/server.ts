import { createI18nServer } from 'next-international/server';
import en from './en';

export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } = createI18nServer(
    {
        en: () => import('./en'),
        vi: () => import('./vi'),
    },
    {
        segmentName: 'locale',
        fallbackLocale: en,
    },
);
