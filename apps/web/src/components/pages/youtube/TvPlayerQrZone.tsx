'use client';

import { QRCode } from 'react-qrcode-logo';
import { motion, useReducedMotion } from 'framer-motion';

import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { TvFocusable } from '@/components/pages/tv/tv-focusable';
import { tvDefaultFocusLeaf } from '@/lib/tv-focus-styles';

const IDLE_QR_SIZE = 200;
const IDLE_QR_SIZE_LG = 240;
const IDLE_QR_SIZE_COMPACT = 152;
const CORNER_QR_SIZE = 72;

type TvPlayerQrZoneProps = {
    roomId: string;
    roomPassword?: string | null;
    locale: 'vi' | 'en';
    showQR: boolean;
    isIdle: boolean;
    /** Side-by-side “this device” layout: smaller QR, no phone-only steps. */
    compact?: boolean;
    /** Room for sticky mode switch on narrow viewports. */
    reserveFooterSpace?: boolean;
    /** TV / reduced-motion path: static layout without framer layout morph. */
    disableLayoutMorph?: boolean;
    /** Dedicated `/tv` route: always show corner QR (not only lg+). */
    forceCornerVisible?: boolean;
    /** Spatial navigation focus key for idle QR anchor. */
    spatialFocusKey?: string;
    spatialFocusOnMount?: boolean;
    onOpenSettingsAction: () => void;
};

function PlayerQrMark({ shareUrl, size }: { shareUrl: string; size: number }) {
    return (
        <QRCode
            value={shareUrl}
            size={size}
            qrStyle="dots"
            eyeRadius={5}
            quietZone={size >= 160 ? 4 : 2}
            ecLevel="M"
            bgColor="#ffffff"
            fgColor="#0a0a0a"
        />
    );
}

export function TvPlayerQrZone({
    roomId,
    roomPassword,
    locale,
    showQR,
    isIdle,
    compact = false,
    reserveFooterSpace = false,
    disableLayoutMorph = false,
    forceCornerVisible = false,
    spatialFocusKey,
    spatialFocusOnMount = false,
    onOpenSettingsAction: onOpenSettings,
}: TvPlayerQrZoneProps) {
    const t = useScopedI18n('youtubePage');
    const reduceMotion = useReducedMotion();
    const staticLayout = disableLayoutMorph || reduceMotion;

    const shareUrl = generateShareableUrl({
        roomId,
        password: resolveRoomPasswordForShare(roomPassword ?? undefined),
        locale,
    });

    const layoutTransition = reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 };

    const steps = compact ? [] : [t('tvEmptyStep1'), t('tvEmptyStep2'), t('tvEmptyStep3')];
    const idleTitle = compact ? t('tvEmptyTitleBoth') : t('tvEmptyTitle');
    const idleSubtitle = compact ? t('tvEmptySubtitleBoth') : t('tvEmptySubtitle');

    const Shell = staticLayout ? 'div' : motion.div;
    const ShellButton = staticLayout ? 'button' : motion.button;
    const ShellSpan = staticLayout ? 'span' : motion.span;
    const ShellList = staticLayout ? 'ol' : motion.ol;
    const shellMotionProps = staticLayout
        ? {}
        : { layout: true as const, transition: layoutTransition };

    const qrShell = (
        <Shell
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-qr-shell' })}
            className={cn(
                isIdle
                    ? staticLayout
                        ? 'rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4'
                        : 'rounded-2xl bg-white p-3 shadow-[0_24px_80px_rgb(0_0_0_0.45)] sm:p-4'
                    : 'rounded-lg',
            )}
        >
            {showQR ? (
                isIdle ? (
                    compact ? (
                        <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE_COMPACT} />
                    ) : staticLayout ? (
                        <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE_LG} />
                    ) : (
                        <>
                            <div className="lg:hidden">
                                <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE} />
                            </div>
                            <div className="hidden lg:block">
                                <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE_LG} />
                            </div>
                        </>
                    )
                ) : (
                    <div style={{ width: CORNER_QR_SIZE }}>
                        <PlayerQrMark shareUrl={shareUrl} size={CORNER_QR_SIZE} />
                    </div>
                )
            ) : (
                <div
                    className={cn(
                        'flex items-center justify-center rounded-xl bg-zinc-100 font-mono font-semibold tabular-nums text-zinc-900',
                        isIdle
                            ? compact
                                ? 'h-[152px] w-[152px] text-5xl'
                                : 'h-[240px] w-[240px] text-6xl sm:text-7xl'
                            : 'h-[80px] w-[80px] text-2xl',
                    )}
                >
                    {roomId}
                </div>
            )}
        </Shell>
    );

    const roomLabel = isIdle ? (
        <ShellSpan
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-room-label' })}
            className={cn(
                'mt-4 text-center font-semibold tabular-nums text-white',
                !staticLayout && 'drop-shadow-sm',
                compact ? 'text-2xl' : 'text-3xl sm:text-4xl',
            )}
        >
            {`${t('tvRoomCode')}: ${roomId}`}
        </ShellSpan>
    ) : (
        <Shell
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-room-label' })}
            className={cn(
                'mt-1 grid grid-cols-4 font-mono text-2xl font-semibold leading-none tabular-nums text-white',
                !staticLayout && 'drop-shadow-sm',
            )}
            style={{ width: CORNER_QR_SIZE }}
        >
            {roomId.split('').map((digit, index) => (
                <span key={`${digit}-${index}`} className="text-center">
                    {digit}
                </span>
            ))}
        </Shell>
    );

    const idleQrAnchor = spatialFocusKey ? (
        <Shell
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-qr-anchor' })}
            className="group flex flex-col items-center rounded-2xl outline-none"
        >
            {qrShell}
            {roomLabel}
        </Shell>
    ) : (
        <ShellButton
            type="button"
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-qr-anchor' })}
            onClick={onOpenSettings}
            className="group flex flex-col items-center rounded-2xl outline-none"
            aria-label={t('tvEmptyQrAria')}
        >
            {qrShell}
            {roomLabel}
        </ShellButton>
    );

    if (isIdle) {
        return (
            <div
                className={cn(
                    'absolute inset-0 z-[5] flex overflow-y-auto overscroll-y-contain bg-background px-4 py-safe-offset sm:px-8',
                    compact
                        ? 'items-start justify-center lg:items-center lg:px-10 lg:py-10'
                        : 'items-start justify-center pt-4 sm:items-center sm:justify-center sm:py-8',
                    reserveFooterSpace && 'pb-28',
                )}
            >
                {!staticLayout ? (
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgb(39_39_42_/_0.55),transparent_65%)]" />
                ) : null}

                <Shell
                    {...shellMotionProps}
                    className={cn(
                        'relative z-[1] flex w-full flex-col items-center text-center',
                        compact ? 'max-w-sm py-2 lg:py-0' : 'max-w-xl py-2 sm:py-0',
                    )}
                >
                    <div
                        className={cn(
                            'flex flex-col items-center gap-2 sm:gap-3',
                            compact ? 'mb-4 sm:mb-5' : 'mb-5 sm:mb-8',
                        )}
                    >
                        <h1
                            className={cn(
                                'text-balance font-semibold leading-tight tracking-tight text-zinc-50',
                                compact
                                    ? 'max-w-[20ch] text-xl sm:text-2xl lg:text-[1.65rem]'
                                    : 'max-w-[22ch] text-2xl sm:max-w-none sm:text-4xl',
                            )}
                        >
                            {idleTitle}
                        </h1>
                        <p
                            className={cn(
                                'max-w-sm text-pretty leading-relaxed sm:max-w-md',
                                staticLayout ? 'text-base text-zinc-300' : 'text-zinc-400',
                                compact
                                    ? 'text-sm lg:text-[0.9375rem]'
                                    : 'text-sm sm:text-base lg:text-lg',
                            )}
                        >
                            {idleSubtitle}
                        </p>
                    </div>

                    {spatialFocusKey ? (
                        <TvFocusable
                            focusKey={spatialFocusKey}
                            focusOnMount={spatialFocusOnMount}
                            accessibilityLabel={t('tvEmptyQrAria')}
                            onEnterPress={onOpenSettings}
                            className={({ focused }) =>
                                tvDefaultFocusLeaf(focused, 'mt-0 rounded-2xl p-2')
                            }
                        >
                            {idleQrAnchor}
                        </TvFocusable>
                    ) : (
                        idleQrAnchor
                    )}

                    {compact ? (
                        <p
                            className={cn(
                                'mt-5 max-w-xs text-center text-xs leading-relaxed',
                                staticLayout ? 'text-zinc-300' : 'text-zinc-500',
                            )}
                        >
                            {t('tvIdleBothInvite')}
                        </p>
                    ) : (
                        <ShellList className="mt-5 w-full max-w-md space-y-3 text-left sm:mt-10 sm:space-y-5">
                            {steps.map((step, index) => (
                                <li key={step} className="flex items-start gap-3 sm:gap-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700/90 text-sm font-medium text-zinc-300">
                                        {index + 1}
                                    </span>
                                    <span
                                        className={cn(
                                            'pt-1 text-sm leading-relaxed sm:text-base',
                                            staticLayout ? 'text-zinc-300' : 'text-zinc-400',
                                        )}
                                    >
                                        {step}
                                    </span>
                                </li>
                            ))}
                        </ShellList>
                    )}
                </Shell>
            </div>
        );
    }

    return (
        <Shell
            {...shellMotionProps}
            {...(staticLayout ? {} : { layoutId: 'tv-player-qr-anchor' })}
            className={forceCornerVisible ? 'block' : 'hidden lg:block'}
        >
            <div
                className={cn(
                    'player-qr-zone flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#3ea6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
                )}
                onClick={onOpenSettings}
                onKeyDown={(e) => e.key === 'Enter' && onOpenSettings()}
                role="button"
                tabIndex={0}
                aria-label={`${t('tvRoomCode')} ${roomId}. ${t('settings')}`}
            >
                {qrShell}
                {roomLabel}
            </div>
        </Shell>
    );
}
