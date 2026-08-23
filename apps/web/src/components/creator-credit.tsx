'use client';

import { CREATOR_GITHUB_URL, CREATOR_HANDLE } from '@/lib/creator';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

type CreatorCreditProps = {
    /** Phone settings link to GitHub. TV stays plain text so D-pad never lands here. */
    linked?: boolean;
    tone?: 'default' | 'tv';
    className?: string;
};

export function CreatorCredit({ linked = true, tone = 'default', className }: CreatorCreditProps) {
    const t = useScopedI18n('credit');

    const handle = linked ? (
        <a
            href={CREATOR_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
        >
            {CREATOR_HANDLE}
        </a>
    ) : (
        <span>{CREATOR_HANDLE}</span>
    );

    return (
        <footer
            className={cn(
                tone === 'tv'
                    ? 'tv-settings-credit'
                    : 'px-1 text-center text-xs leading-relaxed text-muted-foreground',
                className,
            )}
        >
            <p>
                {t('bylinePrefix')} {handle}
            </p>
            <p>{t('tagline')}</p>
        </footer>
    );
}
