'use client';

import { useScopedI18n } from '@/locales/client';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useWhisperAvailable } from '@/hooks/use-whisper-available';
import { isWebSpeechRecognitionSupported } from '@/lib/speech-recognition';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function VoiceSearchSettingsRow() {
    const t = useScopedI18n('voiceSearchSettings');
    const { whisperAvailable, checked } = useWhisperAvailable();
    const useWhisperVoiceSearch = useAppSettingsStore((state) => state.useWhisperVoiceSearch);
    const setUseWhisperVoiceSearch = useAppSettingsStore((state) => state.setUseWhisperVoiceSearch);

    if (!checked || !whisperAvailable) {
        return null;
    }

    const webSpeechSupported = isWebSpeechRecognitionSupported();

    return (
        <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                    <Label htmlFor="use-whisper-voice-search" className="text-sm font-medium">
                        {t('useWhisper')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        {webSpeechSupported
                            ? t('descriptionWithBrowser')
                            : t('descriptionFallback')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('useWhisperHint')}</p>
                </div>
                <Switch
                    id="use-whisper-voice-search"
                    checked={useWhisperVoiceSearch}
                    onCheckedChange={setUseWhisperVoiceSearch}
                />
            </div>
        </div>
    );
}
