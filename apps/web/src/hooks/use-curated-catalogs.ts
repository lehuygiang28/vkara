'use client';

import { useMemo } from 'react';
import { getCuratedCatalogsForLocale, type UiLocale } from '@vkara/curated-playlists';

import { useCurrentLocale } from '@/locales/client';

export function useCuratedCatalogs() {
    const locale = useCurrentLocale() as UiLocale;

    return useMemo(() => getCuratedCatalogsForLocale(locale), [locale]);
}
