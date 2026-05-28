'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId } from '@/lib/utils';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useJoinRoom } from '@/hooks/use-join-room';

import { QRScanner } from '@/components/qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/components/ui/input-otp';

export function RemoteJoinLobby() {
    const t = useScopedI18n('joinLobby');
    const searchParams = useSearchParams();
    const { connectionStatus } = useWebSocket();
    const {
        joinRoom,
        joinFromScan,
        joinRoomId,
        joinRoomPassword,
        setJoinRoomId,
        setJoinRoomPassword,
    } = useJoinRoom();

    const isConnected = connectionStatus === 'OPEN';

    useEffect(() => {
        const roomIdParam = searchParams.get('roomId');
        const passwordParam = searchParams.get('password');
        if (roomIdParam && isValidRoomId(roomIdParam)) {
            setJoinRoomId(roomIdParam);
        }
        if (passwordParam) {
            setJoinRoomPassword(passwordParam);
        }
    }, [searchParams, setJoinRoomId, setJoinRoomPassword]);

    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-safe-offset pb-safe-offset pt-safe-offset">
            <div className="w-full max-w-sm space-y-6">
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lobby-join-room-id">{t('roomIdLabel')}</Label>
                    <div className="flex flex-col items-center space-y-3">
                        <InputOTP
                            id="lobby-join-room-id"
                            maxLength={6}
                            value={joinRoomId}
                            onChange={setJoinRoomId}
                            inputMode="numeric"
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lobby-join-room-password">{t('passwordLabel')}</Label>
                    <Input
                        id="lobby-join-room-password"
                        type="password"
                        value={joinRoomPassword}
                        onChange={(e) => setJoinRoomPassword(e.target.value)}
                        placeholder={t('passwordPlaceholder')}
                    />
                </div>

                <Button
                    onClick={() => joinRoom()}
                    disabled={!isConnected}
                    className="w-full"
                    size="lg"
                >
                    {t('joinButton')}
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">{t('or')}</span>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <QRScanner onScan={joinFromScan} buttonClassName="w-full" />
                </div>
            </div>
        </div>
    );
}
