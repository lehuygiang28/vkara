'use client';

import { QRCode } from 'react-qrcode-logo';
import { motion, useReducedMotion } from 'framer-motion';

import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/shared-utils';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

const IDLE_QR_SIZE = 200;
const IDLE_QR_SIZE_LG = 240;
const CORNER_QR_SIZE = 72;

type TvPlayerQrZoneProps = {
    roomId: string;
    roomPassword?: string | null;
    locale: 'vi' | 'en';
    showQR: boolean;
    isIdle: boolean;
    onOpenSettingsAction: () => void;
};

function formatRoomId(roomId: string) {
    return `${roomId.slice(0, 3)} ${roomId.slice(3)}`;
}

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

    const steps = [t('tvEmptyStep1'), t('tvEmptyStep2'), t('tvEmptyStep3')];

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
                    <>
                        <div className="lg:hidden">
                            <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE} />
                        </div>
                        <div className="hidden lg:block">
                            <PlayerQrMark shareUrl={shareUrl} size={IDLE_QR_SIZE_LG} />
                        </div>
                    </>
                ) : (
                    <PlayerQrMark shareUrl={shareUrl} size={CORNER_QR_SIZE} />
                )
            ) : (
                <div
                    className={cn(
                        'flex items-center justify-center rounded-xl bg-zinc-100 font-mono font-semibold tracking-[0.2em] text-zinc-900',
                        isIdle ? 'h-[240px] w-[240px] text-4xl' : 'h-[72px] w-[72px] text-sm',
                    )}
                >
                    {formatRoomId(roomId)}
                </div>
            )}
        </motion.div>
    );

    const roomLabel = (
        <motion.span
            layout
            layoutId="tv-player-room-label"
            transition={layoutTransition}
            className={cn(
                'font-semibold tabular-nums text-white drop-shadow-sm',
                isIdle
                    ? 'mt-4 text-center text-lg tracking-wide'
                    : 'mt-1 text-center text-sm tracking-wide',
            )}
        >
            {isIdle ? `${t('tvRoomCode')}: ${formatRoomId(roomId)}` : formatRoomId(roomId)}
        </motion.span>
    );

    if (isIdle) {
        return (
            <div className="absolute inset-0 z-[5] flex items-center justify-center overflow-y-auto bg-zinc-950 px-4 py-6 sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgb(39_39_42_/_0.55),transparent_62%)]" />

                <motion.div
                    layout
                    className="relative z-[1] flex w-full max-w-xl flex-col items-center text-center"
                >
                    <div className="mb-6 flex flex-col items-center gap-3 sm:mb-8 sm:gap-4">
                        <h1 className="max-w-[16ch] text-balance text-3xl font-semibold leading-tight tracking-tight text-zinc-50 sm:max-w-none sm:text-4xl">
                            {t('tvEmptyTitle')}
                        </h1>
                        <p className="hidden max-w-md text-pretty text-base leading-relaxed text-zinc-400 sm:block sm:text-lg">
                            {t('tvEmptySubtitle')}
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
                aria-label={`${t('tvRoomCode')} ${formatRoomId(roomId)}. ${t('settings')}`}
            >
                {qrShell}
                {roomLabel}
            </div>
        </motion.div>
    );
}
