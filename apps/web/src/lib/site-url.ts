/** Canonical site URL for metadata, manifest, and Open Graph. */
export function getSiteUrl(): URL {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (fromEnv) {
        return new URL(fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`);
    }

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        return new URL(`https://${vercel}/`);
    }

    return new URL('http://localhost:3000/');
}
