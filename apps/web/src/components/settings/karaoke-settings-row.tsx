'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useKaraokeStore } from '@/store/karaokeStore';
import { useI18n } from '@/locales/client';

export function KaraokeSettingsRow() {
    const t = useI18n();
    const dismissDurationSec = useKaraokeStore((s) => s.dismissDurationSec);
    const setDismissDurationSec = useKaraokeStore((s) => s.setDismissDurationSec);
    const showScoreOnPhone = useKaraokeStore((s) => s.showScoreOnPhone);
    const setShowScoreOnPhone = useKaraokeStore((s) => s.setShowScoreOnPhone);

    return (
        <div className="divide-y divide-border">
            {/* Dismiss duration */}
            <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="karaoke-dismiss-duration" className="text-sm font-medium">
                            {t('karaoke.settingsDismissLabel')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('karaoke.settingsDismissHint')}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                            id="karaoke-dismiss-duration"
                            type="number"
                            min={1}
                            max={60}
                            value={dismissDurationSec}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (v >= 1 && v <= 60) setDismissDurationSec(v);
                            }}
                            className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">
                            {t('karaoke.settingsDismissUnit')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Show score on phone toggle */}
            <div className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="karaoke-show-on-phone" className="text-sm font-medium">
                            {t('karaoke.settingsShowOnPhoneLabel')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {t('karaoke.settingsShowOnPhoneHint')}
                        </p>
                    </div>
                    <Switch
                        id="karaoke-show-on-phone"
                        checked={showScoreOnPhone}
                        onCheckedChange={setShowScoreOnPhone}
                        className="shrink-0"
                    />
                </div>
            </div>
        </div>
    );
}
