import { createI18nServer, setStaticParamsLocale } from 'next-international/server';
import vi from './vi';

export { setStaticParamsLocale };

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
