import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

type BrandIconProps = {
    className?: string;
    style?: CSSProperties;
};

/** Simple Icons: youtube */
export function YouTubeBrandIcon({ className, style }: BrandIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-5 w-5', className)}
            style={style}
            aria-hidden
        >
            <path
                fill="currentColor"
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
            />
        </svg>
    );
}

/** Simple Icons: tiktok */
export function TikTokBrandIcon({ className, style }: BrandIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-5 w-5', className)}
            style={style}
            aria-hidden
        >
            <path
                fill="currentColor"
                d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.56a8.28 8.28 0 0 0 4.76 1.49V6.55a4.85 4.85 0 0 1-1-.86z"
            />
        </svg>
    );
}
