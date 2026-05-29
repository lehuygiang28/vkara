import YoutubePlayerPage from '@/components/pages/youtube';
import { setStaticParamsLocale } from '@/locales/server';

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default async function Page({ params }: PageProps) {
    const { locale } = await params;
    setStaticParamsLocale(locale);

    return <YoutubePlayerPage />;
}
