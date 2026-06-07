'use client';

import type { VideoSource } from '@vkara/youtube';
import { useScopedI18n } from '@/locales/client';
import { isExperimentsEnabled } from '@/lib/experiments';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useSearchStore } from '@/store/searchStore';
import { SettingsGroup, SettingsSection } from '@/components/settings/settings-section';
import { VideoProviderSelector } from '@/components/settings/video-provider-selector';
import { Label } from '@/components/ui/label';

export function ExperimentsSettingsSection() {
    const t = useScopedI18n('experimentsSettings');
    const videoProvider = useAppSettingsStore((state) => state.videoProvider);
    const setVideoProvider = useAppSettingsStore((state) => state.setVideoProvider);

    if (!isExperimentsEnabled()) {
        return null;
    }

    const applyProvider = (next: VideoSource) => {
        if (next === videoProvider) {
            return;
        }

        setVideoProvider(next);

        const query = useSearchStore.getState().searchQuery.trim();
        if (query) {
            void useSearchStore.getState().performSearch(query);
        }
    };

    return (
        <SettingsSection
            title={t('sectionTitle')}
            hint={t('sectionHint')}
            scope="device"
            scopeLabel={t('scopeDevice')}
        >
            <SettingsGroup>
                <div className="space-y-3 px-4 py-3.5">
                    <p className="text-xs text-amber-600 dark:text-amber-500">{t('warning')}</p>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('videoProvider')}</Label>
                        <p className="text-xs text-muted-foreground">{t('videoProviderHint')}</p>
                        <VideoProviderSelector
                            value={videoProvider}
                            onChangeAction={applyProvider}
                            labels={{
                                group: t('videoProviderGroup'),
                                providerYoutube: t('providerYoutube'),
                                providerTiktok: t('providerTiktok'),
                            }}
                        />
                    </div>
                </div>
            </SettingsGroup>
        </SettingsSection>
    );
}
