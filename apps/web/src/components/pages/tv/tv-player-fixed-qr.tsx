'use client';

import { QRCode } from 'react-qrcode-logo';

import { useScopedI18n } from '@/locales/client';
import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { cn } from '@/lib/utils';

/**
 * Total canvas CSS px — keep in sync with --tv-fixed-qr-canvas (72px).
 * react-qrcode-logo paints size + 2*quietZone; module `size` must be QR_SIZE −
 * 2*quietZone so the bitmap/CSS box stay 72×72.
 * Quiet zone ≥ mark border-radius so rounded corners only clip white margin.
 * Expand via CSS transform on the wrapper only — never change this for expand.
 */
const QR_SIZE = 72;
const QR_QUIET_ZONE = 3;

type TvPlayerFixedQrProps = {
    roomId: string;
    roomPassword?: string | null;
    locale: 'vi' | 'en';
    onOpenSettingsAction: () => void;
    /** Scales up via CSS when player chrome is visible. */
    expanded?: boolean;
    className?: string;
};

/** Fixed top-left corner QR during TV playback — independent of control overlay. */
export function TvPlayerFixedQr({
    roomId,
    roomPassword,
    locale,
    onOpenSettingsAction,
    expanded = false,
    className,
}: TvPlayerFixedQrProps) {
    const t = useScopedI18n('youtubePage');

    const shareUrl = generateShareableUrl({
        roomId,
        password: resolveRoomPasswordForShare(roomPassword ?? undefined),
        locale,
    });

    return (
        <div
            className={cn(
                'tv-player-fixed-qr pointer-events-auto',
                expanded && 'tv-player-fixed-qr--expanded',
                className,
            )}
        >
            <button
                type="button"
                onClick={onOpenSettingsAction}
                className="tv-player-fixed-qr__button group flex flex-col items-center outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                aria-label={`${t('tvRoomCode')} ${roomId}. ${t('settings')}`}
            >
                <div className="tv-player-fixed-qr__mark bg-white">
                    <QRCode
                        value={shareUrl}
                        size={QR_SIZE - QR_QUIET_ZONE * 2}
                        qrStyle="dots"
                        eyeRadius={5}
                        quietZone={QR_QUIET_ZONE}
                        ecLevel="M"
                        bgColor="#ffffff"
                        fgColor="#0a0a0a"
                    />
                </div>
                <div className="tv-player-fixed-qr__digits mt-0.5 grid grid-cols-4 font-mono font-semibold leading-none tabular-nums text-white">
                    {roomId.split('').map((digit, index) => (
                        <span key={`${digit}-${index}`} className="text-center">
                            {digit}
                        </span>
                    ))}
                </div>
            </button>
        </div>
    );
}
