'use client';

import { AppearanceSettingsInline } from '@/components/settings/appearance-settings-inline';
import { SettingsGroup, SettingsSection } from '@/components/settings/settings-section';
import { SearchHistorySettingsRow } from '@/components/settings/search-history-settings-row';
import { ExperimentsSettingsSection } from '@/components/settings/experiments-settings-section';
import { VoiceSearchSettingsRow } from '@/components/settings/voice-search-settings-row';
import { LayoutModePicker } from '@/components/layout-mode-picker';
import { useScopedI18n } from '@/locales/client';

export function DeviceSettingsSection() {
    const tSections = useScopedI18n('settingsSections');

    return (
        <>
        <ExperimentsSettingsSection />
        <SettingsSection
            title={tSections('thisDevice')}
            hint={tSections('deviceHint')}
            scope="device"
            scopeLabel={tSections('scopeDevice')}
        >
            <SettingsGroup>
                <div className="px-4 py-3.5">
                    <LayoutModePicker id="selectLayoutMode" />
                </div>
                <VoiceSearchSettingsRow />
                <SearchHistorySettingsRow />
                <AppearanceSettingsInline />
            </SettingsGroup>
        </SettingsSection>
        </>
    );
}
