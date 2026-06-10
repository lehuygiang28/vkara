'use client';

import { QRCode } from 'react-qrcode-logo';

import { useScopedI18n } from '@/locales/client';
import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { cn } from '@/lib/utils';

const COMPACT_QR_SIZE = 60;
const EXPANDED_QR_SIZE = 88;

type TvPlayerFixedQrProps = {
    roomId: string;
    roomPassword?: string | null;
    locale: 'vi' | 'en';
    onOpenSettingsAction: () => void;
    /** Grows to align with the top-bar title row when player chrome is visible. */
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

    const qrSize = expanded ? EXPANDED_QR_SIZE : COMPACT_QR_SIZE;

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
                className="tv-player-fixed-qr__button group flex flex-col items-center rounded-lg outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                aria-label={`${t('tvRoomCode')} ${roomId}. ${t('settings')}`}
            >
                <div className="tv-player-fixed-qr__mark overflow-hidden rounded-lg bg-white">
                    <QRCode
                        value={shareUrl}
                        size={qrSize}
                        qrStyle="dots"
                        eyeRadius={expanded ? 6 : 5}
                        quietZone={expanded ? 3 : 2}
                        ecLevel="M"
                        bgColor="#ffffff"
                        fgColor="#0a0a0a"
                    />
                </div>
                <div
                    className="tv-player-fixed-qr__digits mt-0.5 grid grid-cols-4 font-mono font-semibold leading-none tabular-nums text-white drop-shadow-sm"
                    style={{ width: qrSize }}
                >
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
