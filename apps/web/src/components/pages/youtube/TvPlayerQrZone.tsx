'use client';

import { QRCode } from 'react-qrcode-logo';
import { motion, useReducedMotion } from 'framer-motion';

import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

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
    onOpenSettingsAction: onOpenSettings,
}: TvPlayerQrZoneProps) {
    const t = useScopedI18n('youtubePage');
    const reduceMotion = useReducedMotion();

    const shareUrl = generateShareableUrl({
        roomId,
        password: resolveRoomPasswordForShare(roomPassword ?? undefined),
        locale,
    });

    const layoutTransition = reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 };

    const steps = compact
        ? []
        : [t('tvEmptyStep1'), t('tvEmptyStep2'), t('tvEmptyStep3')];
    const idleTitle = compact ? t('tvEmptyTitleBoth') : t('tvEmptyTitle');
    const idleSubtitle = compact ? t('tvEmptySubtitleBoth') : t('tvEmptySubtitle');

    const qrShell = (
        <motion.div
            layout
            layoutId="tv-player-qr-shell"
            transition={layoutTransition}
            className={cn(
                isIdle
                    ? 'rounded-2xl bg-white p-3 shadow-[0_24px_80px_rgb(0_0_0_0.45)] sm:p-4'
                    : 'rounded-lg',
            )}
        >
            {showQR ? (
                isIdle ? (
                    compact ? (
                        <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE_COMPACT} />
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
        </motion.div>
    );

    const roomLabel = isIdle ? (
        <motion.span
            layout
            layoutId="tv-player-room-label"
            transition={layoutTransition}
            className={cn(
                'mt-4 text-center font-semibold tabular-nums text-white drop-shadow-sm',
                compact ? 'text-2xl' : 'text-3xl sm:text-4xl',
            )}
        >
            {`${t('tvRoomCode')}: ${roomId}`}
        </motion.span>
    ) : (
        <motion.div
            layout
            layoutId="tv-player-room-label"
            transition={layoutTransition}
            className="mt-1 grid grid-cols-4 font-mono text-2xl font-semibold leading-none tabular-nums text-white drop-shadow-sm"
            style={{ width: CORNER_QR_SIZE }}
        >
            {roomId.split('').map((digit, index) => (
                <span key={`${digit}-${index}`} className="text-center">
                    {digit}
                </span>
            ))}
        </motion.div>
    );

    if (isIdle) {
        return (
            <div
                className={cn(
                    'absolute inset-0 z-[5] flex items-center justify-center overflow-y-auto bg-zinc-950 px-4 py-6 sm:px-8 sm:py-8',
                    compact && 'lg:items-center lg:px-10 lg:py-10',
                )}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />

                <motion.div
                    layout
                    className={cn(
                        'relative z-[1] flex w-full flex-col items-center text-center',
                        compact ? 'max-w-sm' : 'max-w-xl',
                    )}
                >
                    <div
                        className={cn(
                            'flex flex-col items-center gap-3',
                            compact ? 'mb-5' : 'mb-6 sm:mb-8 sm:gap-4',
                        )}
                    >
                        <h1
                            className={cn(
                                'text-balance font-semibold leading-tight tracking-tight text-zinc-50',
                                compact
                                    ? 'max-w-[18ch] text-2xl lg:text-[1.65rem]'
                                    : 'max-w-[16ch] text-3xl sm:max-w-none sm:text-4xl',
                            )}
                        >
                            {idleTitle}
                        </h1>
                        <p
                            className={cn(
                                'max-w-md text-pretty leading-relaxed text-zinc-400',
                                compact
                                    ? 'text-sm lg:text-[0.9375rem]'
                                    : 'hidden text-base sm:block sm:text-lg',
                            )}
                        >
                            {idleSubtitle}
                        </p>
                    </div>

                    <motion.button
                        type="button"
                        layout
                        layoutId="tv-player-qr-anchor"
                        transition={layoutTransition}
                        onClick={onOpenSettings}
                        className="group flex flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                        aria-label={t('tvEmptyQrAria')}
                    >
                        {qrShell}
                        {roomLabel}
                    </motion.button>

                    {compact ? (
                        <p className="mt-5 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
                            {t('tvIdleBothInvite')}
                        </p>
                    ) : (
                        <motion.ol className="mt-6 w-full max-w-md space-y-4 text-left sm:mt-10 sm:space-y-5">
                            {steps.map((step, index) => (
                                <li key={step} className="flex items-start gap-4">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-700/90 text-sm font-medium text-zinc-300">
                                        {index + 1}
                                    </span>
                                    <span className="pt-1 text-sm leading-relaxed text-zinc-400 sm:text-base">
                                        {step}
                                    </span>
                                </li>
                            ))}
                        </motion.ol>
                    )}
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            layout
            layoutId="tv-player-qr-anchor"
            transition={layoutTransition}
            className="hidden lg:block"
        >
            <div
                className={cn(
                    'player-qr-zone flex flex-col items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40',
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
        </motion.div>
    );
}
