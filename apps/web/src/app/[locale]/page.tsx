import { notFound } from 'next/navigation';

import YoutubePlayerPage from '@/components/pages/youtube';
import { isAppLocale } from '@/lib/locale-path';
import { setStaticParamsLocale } from '@/locales/server';

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default async function Page({ params }: PageProps) {
    const { locale } = await params;
    if (!isAppLocale(locale)) {
        notFound();
    }
    setStaticParamsLocale(locale);

    return <YoutubePlayerPage />;
}
