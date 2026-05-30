'use client';

import { useMemo } from 'react';

import { AppearanceSettingsInline } from '@/components/settings/appearance-settings-inline';
import {
    SettingsGroup,
    SettingsSection,
} from '@/components/settings/settings-section';
import { SettingsRow } from '@/components/settings/settings-row';
import { SearchHistorySettingsRow } from '@/components/settings/search-history-settings-row';
import { VoiceSearchSettingsRow } from '@/components/settings/voice-search-settings-row';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useI18n, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';

export function DeviceSettingsSection() {
    const t = useI18n();
    const tSections = useScopedI18n('settingsSections');
    const {
        layoutMode,
        layoutModeSource,
        setLayoutMode,
        enableAutoLayoutMode,
        setCurrentTab,
    } = useYouTubeStore();

    const selectedLayoutMode = layoutModeSource === 'auto' ? 'auto' : layoutMode;
    const layoutModeDescriptionKey = useMemo(() => {
        switch (selectedLayoutMode) {
            case 'auto':
                return 'youtubePage.layoutAutoDesc';
            case 'remote':
                return 'youtubePage.layoutRemoteDesc';
            case 'player':
                return 'youtubePage.layoutPlayerDesc';
            case 'both':
                return 'youtubePage.layoutBothDesc';
            default:
                return 'youtubePage.layoutAutoDesc';
        }
    }, [selectedLayoutMode]);

    return (
        <SettingsSection
            title={tSections('thisDevice')}
            hint={tSections('deviceHint')}
            scope="device"
            scopeLabel={tSections('scopeDevice')}
        >
            <SettingsGroup>
                <div className="px-4 py-3.5">
                    <div className="space-y-2">
                        <Label htmlFor="selectLayoutMode" className="text-sm font-medium">
                            {t('youtubePage.selectLayoutMode')}
                        </Label>
                        <Select
                            value={selectedLayoutMode}
                            onValueChange={(value) => {
                                if (value === 'auto') {
                                    enableAutoLayoutMode();
                                    setCurrentTab('search');
                                    return;
                                }
                                const val = value as 'both' | 'remote' | 'player';
                                setLayoutMode(val, 'user');
                                if (val === 'remote') {
                                    setCurrentTab('search');
                                } else if (val === 'player') {
                                    setCurrentTab('queue');
                                }
                            }}
                        >
                            <SelectTrigger id="selectLayoutMode" className="w-full">
                                <SelectValue placeholder={t('youtubePage.selectLayoutMode')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">{t('youtubePage.layoutAuto')}</SelectItem>
                                <SelectItem value="remote">{t('youtubePage.layoutRemote')}</SelectItem>
                                <SelectItem value="player">{t('youtubePage.layoutPlayer')}</SelectItem>
                                <SelectItem value="both">{t('youtubePage.layoutBoth')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{t(layoutModeDescriptionKey)}</p>
                    </div>
                </div>
                <VoiceSearchSettingsRow />
                <SearchHistorySettingsRow />
                <AppearanceSettingsInline />
            </SettingsGroup>
        </SettingsSection>
    );
}
