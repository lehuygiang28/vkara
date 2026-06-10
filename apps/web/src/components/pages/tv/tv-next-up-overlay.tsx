'use client';

import type { ReactNode } from 'react';
import type { YouTubeVideo } from '@vkara/youtube';
import { getVideoThumbnailSrcSet, getVideoThumbnailUrl } from '@vkara/tiktok';
import { RotateCcw, SkipForward } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { CountdownTimer } from '@/components/countdown-timer';
import { YouTubeThumbnailImage } from '@/components/youtube-thumbnail-image';
import { VideoChannels } from '@/components/video-channels';
import { NEXT_VIDEO_COUNTDOWN_SECONDS, useCountdownStore } from '@/store/countdownTimersStore';
import { useScopedI18n } from '@/locales/client';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { tvSettingsIconPlate, tvSettingsLabel, tvSettingsRow } from '@/lib/tv-focus-styles';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';
import { TvNextUpCountdownRing } from './tv-next-up-countdown-ring';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';

type NextUpActionProps = {
    focusKey: string;
    label: string;
    hint?: string;
    icon: ReactNode;
    primary?: boolean;
    onEnterPress: () => void;
    onArrowPress?: (direction: string) => boolean;
};

function NextUpAction({
    focusKey,
    label,
    hint,
    icon,
    primary = false,
    onEnterPress,
    onArrowPress,
}: NextUpActionProps) {
    return (
        <TvFocusable
            focusKey={focusKey}
            accessibilityLabel={label}
            suppressFocusChrome
            onEnterPress={onEnterPress}
            onArrowPress={onArrowPress}
            className={({ focused }) =>
                cn(
                    'tv-next-up-action',
                    primary && 'tv-next-up-action--primary',
                    focused && primary && 'tv-next-up-action--primary-focused',
                    tvSettingsRow(focused, { selected: primary && !focused }),
                )
            }
        >
            {({ focused }) => (
                <>
                    <span className={tvSettingsIconPlate(focused)}>{icon}</span>
                    <span className="min-w-0 flex-1 text-left">
                        <span className={cn('block', tvSettingsLabel(focused))}>{label}</span>
                        {hint ? <span className="tv-next-up-action__hint">{hint}</span> : null}
                    </span>
                </>
            )}
        </TvFocusable>
    );
}

type TvNextUpOverlayProps = {
    nextVideo: YouTubeVideo;
    onPlayNextAction: () => void;
    onReplayAction: () => void;
    onCountdownCompleteAction: () => void;
};

export function TvNextUpOverlay({
    nextVideo,
    onPlayNextAction,
    onReplayAction,
    onCountdownCompleteAction: onCountdownComplete,
}: TvNextUpOverlayProps) {
    const t = useScopedI18n('tvPage');
    const { remainingSeconds, isActive } = useCountdownStore(
        useShallow((s) => ({ remainingSeconds: s.remainingSeconds, isActive: s.isActive })),
    );
    const displaySeconds =
        isActive && remainingSeconds > 0 ? remainingSeconds : NEXT_VIDEO_COUNTDOWN_SECONDS;

    const thumbSrc = getVideoThumbnailUrl({ video: nextVideo, size: 'large' });
    const thumbSrcSet = getVideoThumbnailSrcSet({ video: nextVideo });

    return (
        <div className="tv-next-up-overlay absolute inset-0 z-40">
            <div className="tv-next-up-overlay__scrim" aria-hidden />

            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.nextUpPanel}
                preferredChildFocusKey={TV_FOCUS_KEYS.nextUpPlayNext}
                trapFocus
                className="tv-next-up-overlay__shell"
                aria-label={t('nextUpTitle')}
            >
                <div className="tv-next-up-overlay__layout">
                    <div className="tv-next-up-overlay__media">
                        <div className="tv-next-up-overlay__thumb-wrap">
                            <YouTubeThumbnailImage
                                src={thumbSrc}
                                videoId={nextVideo.id}
                                size="large"
                                alt={nextVideo.title}
                                fill
                                sizes="(max-width: 768px) 92vw, 36rem"
                                className="tv-next-up-overlay__thumb object-cover"
                                priority
                                {...(thumbSrcSet ? { srcSet: thumbSrcSet } : {})}
                            />
                        </div>
                    </div>

                    <div className="tv-next-up-overlay__content">
                        <div className="tv-next-up-overlay__meta">
                            <p className="tv-next-up-overlay__eyebrow">{t('nextUpTitle')}</p>

                            <h2 className="tv-next-up-overlay__title">{nextVideo.title}</h2>

                            <VideoChannels
                                video={nextVideo}
                                tone="inverse"
                                maxLines={2}
                                className="tv-next-up-overlay__channels"
                            />
                        </div>

                        <div className="tv-next-up-overlay__footer">
                            <TvNextUpCountdownRing
                                remainingSeconds={displaySeconds}
                                label={t('autoPlayLabel')}
                                compact
                            />
                            <CountdownTimer
                                classNames="sr-only"
                                initialSeconds={NEXT_VIDEO_COUNTDOWN_SECONDS}
                                onCountdownComplete={onCountdownComplete}
                            />

                            <div
                                className="tv-next-up-overlay__actions"
                                role="toolbar"
                                aria-label={t('nextUpActions')}
                            >
                                <NextUpAction
                                    focusKey={TV_FOCUS_KEYS.nextUpPlayNext}
                                    label={t('playNext')}
                                    hint={t('playNextHint')}
                                    primary
                                    icon={<SkipForward className="h-6 w-6" strokeWidth={2.25} />}
                                    onEnterPress={onPlayNextAction}
                                />

                                <NextUpAction
                                    focusKey={TV_FOCUS_KEYS.nextUpReplay}
                                    label={t('replay')}
                                    icon={<RotateCcw className="h-6 w-6" strokeWidth={2.25} />}
                                    onEnterPress={onReplayAction}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </TvSpatialOverlayShell>
        </div>
    );
}
