import { buildStructuredData } from '@/lib/seo/structured-data';
import type { AppLocale } from '@/lib/locale-path';

type JsonLdProps = {
    locale: AppLocale;
    title: string;
    description: string;
    siteName: string;
};

export function JsonLd({ locale, title, description, siteName }: JsonLdProps) {
    const schemas = buildStructuredData({ locale, title, description, siteName });

    return (
        <>
            {schemas.map((schema) => (
                <script
                    key={schema['@type']}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
        </>
    );
}
