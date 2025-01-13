import { createI18nServer } from 'next-international/server';
import vi from './vi';

export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } = createI18nServer(
    {
        vi: () => import('./vi'),
        en: () => import('./en'),
    },
    {
        segmentName: 'locale',
        fallbackLocale: vi,
    },
);
