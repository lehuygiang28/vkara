import { notFound } from 'next/navigation';

import TvPage from '@/components/pages/tv/tv-page';
import { isAppLocale } from '@/lib/locale-path';
import { setStaticParamsLocale } from '@/locales/server';

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default async function TvRoutePage({ params }: PageProps) {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        notFound();
    }
    setStaticParamsLocale(locale);

    return <TvPage />;
}
