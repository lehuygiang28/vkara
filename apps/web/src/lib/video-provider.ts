import type { VideoSource } from '@vkara/youtube';

import { isExperimentsEnabled } from '@/lib/experiments';
import { useAppSettingsStore } from '@/store/appSettingsStore';

export function getEffectiveVideoProvider(): VideoSource {
    if (!isExperimentsEnabled()) {
        return 'youtube';
    }
    return useAppSettingsStore.getState().videoProvider;
}

export function isTikTokProviderActive(): boolean {
    return getEffectiveVideoProvider() === 'tiktok';
}
