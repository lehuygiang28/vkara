'use client';

import { useScopedI18n } from '@/locales/client';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { TooltipButton } from '@/components/tooltip-button';

export function SearchHistorySettingsRow() {
    const t = useScopedI18n('searchHistorySettings');
    const searchHistory = usePersonalizationStore((state) => state.searchHistory);
    const clearSearchHistory = usePersonalizationStore((state) => state.clearSearchHistory);

    if (searchHistory.length === 0) {
        return null;
    }

    return (
        <div className="px-4 py-3.5">
            <div className="space-y-2">
                <div className="space-y-1">
                    <p className="text-sm font-medium">{t('title')}</p>
                    <p className="text-xs text-muted-foreground">{t('description')}</p>
                </div>
                <TooltipButton
                    buttonText={t('clearAll')}
                    tooltipContent={t('clearAll')}
                    onConfirm={clearSearchHistory}
                    variant="destructive"
                    className="w-full"
                    confirmMode
                    confirmContent={
                        <>
                            <h4 className="font-medium leading-none">{t('confirmTitle')}</h4>
                            <p className="text-sm text-muted-foreground">
                                {t('confirmDescription')}
                            </p>
                        </>
                    }
                />
            </div>
        </div>
    );
}
