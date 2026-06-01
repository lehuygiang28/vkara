import Script from 'next/script';

/** Manual Cloudflare Web Analytics beacon (sites not using CF automatic injection). */
export function CloudflareWebAnalytics() {
    const token = process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN;
    if (!token) {
        return null;
    }

    return (
        <Script
            id="cloudflare-web-analytics"
            defer
            src={`https://static.cloudflareinsights.com/beacon.min.js?token=${token}`}
            strategy="afterInteractive"
        />
    );
}
