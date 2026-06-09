'use client';

import { QRCode } from 'react-qrcode-logo';

import { useScopedI18n } from '@/locales/client';
import { generateShareableUrl } from '@/lib/room-share';
import { resolveRoomPasswordForShare } from '@vkara/room';
import { cn } from '@/lib/utils';

const CORNER_QR_SIZE = 72;

type TvPlayerFixedQrProps = {
    roomId: string;
    roomPassword?: string | null;
    locale: 'vi' | 'en';
    onOpenSettingsAction: () => void;
    className?: string;
};

/** Fixed top-left corner QR during TV playback — independent of control overlay. */
export function TvPlayerFixedQr({
    roomId,
    roomPassword,
    locale,
    onOpenSettingsAction,
    className,
}: TvPlayerFixedQrProps) {
    const t = useScopedI18n('youtubePage');

    const shareUrl = generateShareableUrl({
        roomId,
        password: resolveRoomPasswordForShare(roomPassword ?? undefined),
        locale,
    });

    return (
        <div className={cn('tv-player-fixed-qr pointer-events-auto', className)}>
            <button
                type="button"
                onClick={onOpenSettingsAction}
                className="group flex flex-col items-center rounded-lg outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-[#3ea6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                aria-label={`${t('tvRoomCode')} ${roomId}. ${t('settings')}`}
            >
                <div className="overflow-hidden rounded-lg bg-white">
                    <QRCode
                        value={shareUrl}
                        size={CORNER_QR_SIZE}
                        qrStyle="dots"
                        eyeRadius={5}
                        quietZone={2}
                        ecLevel="M"
                        bgColor="#ffffff"
                        fgColor="#0a0a0a"
                    />
                </div>
                <div
                    className="mt-1 grid grid-cols-4 font-mono text-2xl font-semibold leading-none tabular-nums text-white drop-shadow-sm"
                    style={{ width: CORNER_QR_SIZE }}
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
