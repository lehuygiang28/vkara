'use client';

import { Search } from 'lucide-react';

import { useScopedI18n } from '@/locales/client';

export function SearchBrowseHint() {
    const t = useScopedI18n('videoSearch');

    return (
        <div className="flex flex-1 flex-col items-center justify-center px-safe-offset pb-remote-scroll pt-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
                <Search className="h-7 w-7 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-base font-medium text-foreground">{t('browseTitle')}</p>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t('browseHint')}</p>
        </div>
    );
}
