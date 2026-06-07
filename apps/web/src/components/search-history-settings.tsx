'use client';

import { useScopedI18n } from '@/locales/client';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipButton } from '@/components/tooltip-button';

export function SearchHistorySettings() {
    const t = useScopedI18n('searchHistorySettings');
    const searchHistory = usePersonalizationStore((state) => state.searchHistory);
    const clearSearchHistory = usePersonalizationStore((state) => state.clearSearchHistory);

    if (searchHistory.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
}
