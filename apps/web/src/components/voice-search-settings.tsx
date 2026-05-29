'use client';

import { useScopedI18n } from '@/locales/client';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { useWhisperAvailable } from '@/hooks/use-whisper-available';
import { isWebSpeechRecognitionSupported } from '@/lib/speech-recognition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function VoiceSearchSettings() {
    const t = useScopedI18n('voiceSearchSettings');
    const { whisperAvailable, checked } = useWhisperAvailable();
    const useWhisperVoiceSearch = useAppSettingsStore((state) => state.useWhisperVoiceSearch);
    const setUseWhisperVoiceSearch = useAppSettingsStore((state) => state.setUseWhisperVoiceSearch);

    if (!checked || !whisperAvailable) {
        return null;
    }

    const webSpeechSupported = isWebSpeechRecognitionSupported();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>
                    {webSpeechSupported ? t('descriptionWithBrowser') : t('descriptionFallback')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="use-whisper-voice-search">{t('useWhisper')}</Label>
                        <p className="text-xs text-muted-foreground">{t('useWhisperHint')}</p>
                    </div>
                    <Switch
                        id="use-whisper-voice-search"
                        checked={useWhisperVoiceSearch}
                        onCheckedChange={setUseWhisperVoiceSearch}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
