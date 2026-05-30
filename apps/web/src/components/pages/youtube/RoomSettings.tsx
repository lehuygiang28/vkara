'use client';

import { useEffect } from 'react';

import { DeviceSettingsSection } from '@/components/settings/device-settings-section';
import { RoomSettingsSection } from '@/components/settings/room-settings-section';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useScopedI18n } from '@/locales/client';

export function RoomSettings() {
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const isRemoteLayout = effectiveLayoutMode === 'remote';
    const resetState = useRoomSettingsStore((state) => state.resetState);
    const t = useScopedI18n('settingsSections');

    useEffect(() => {
        return () => {
            resetState();
        };
    }, [resetState]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ScrollArea className="h-full" hideScrollbar>
                <div className="space-y-8 px-safe-offset pb-remote-scroll pt-safe-offset">
                    <header className="px-1">
                        <h1 className="text-lg font-semibold tracking-tight">{t('pageTitle')}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{t('pageDescription')}</p>
                    </header>

                    <RoomSettingsSection isRemoteLayout={isRemoteLayout} />
                    <DeviceSettingsSection />
                </div>
            </ScrollArea>
        </div>
    );
}
