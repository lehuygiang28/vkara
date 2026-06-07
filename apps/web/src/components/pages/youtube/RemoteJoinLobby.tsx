'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import { roomCodeFieldProps, roomCodeOtpSlotClassName, roomSecretFieldProps } from '@/lib/room-field-autofill';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useJoinRoom } from '@/hooks/use-join-room';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';

import { LanguageSwitcher } from '@/components/language-switcher';
import { QRScanner } from '@/components/qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

type RemoteJoinLobbyProps = {
    allowCreateRoom?: boolean;
};

export function RemoteJoinLobby({ allowCreateRoom = false }: RemoteJoinLobbyProps) {
    const t = useScopedI18n('joinLobby');
    const tRoom = useScopedI18n('roomSettings');
    const searchParams = useSearchParams();
    const { connectionStatus, ensureConnectedAndSend } = useWebSocket();
    const { roomPassword, setRoomPassword, resetJoinFormState } = useRoomSettingsStore();
    const {
        joinRoom,
        joinFromScan,
        joinRoomId,
        joinRoomPassword,
        setJoinRoomId,
        setJoinRoomPassword,
    } = useJoinRoom();

    const isConnected = connectionStatus === 'OPEN';

    const createRoom = useCallback(() => {
        const password = roomPassword.trim();
        ensureConnectedAndSend({
            type: 'createRoom',
            password: password || undefined,
        });
        resetJoinFormState();
    }, [roomPassword, ensureConnectedAndSend, resetJoinFormState]);

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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-safe-offset pb-safe-offset pt-safe-offset">
            <div className="flex shrink-0 justify-end pb-1">
                <LanguageSwitcher />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-sm space-y-6">
                <form
                    className="space-y-6"
                    autoComplete="off"
                    onSubmit={(event) => {
                        event.preventDefault();
                        joinRoom();
                    }}
                >
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold tracking-tight">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lobby-join-room-id">{t('roomIdLabel')}</Label>
                    <div className="flex flex-col items-center space-y-3">
                        <InputOTP
                            id="lobby-join-room-id"
                            maxLength={ROOM_ID_LENGTH}
                            value={joinRoomId}
                            onChange={setJoinRoomId}
                            inputMode="numeric"
                            {...roomCodeFieldProps}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot index={0} className={roomCodeOtpSlotClassName} />
                                <InputOTPSlot index={1} className={roomCodeOtpSlotClassName} />
                                <InputOTPSlot index={2} className={roomCodeOtpSlotClassName} />
                                <InputOTPSlot index={3} className={roomCodeOtpSlotClassName} />
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
                        {...roomSecretFieldProps}
                    />
                </div>

                <Button
                    type="submit"
                    disabled={!isConnected}
                    className="w-full"
                    size="lg"
                >
                    {t('joinButton')}
                </Button>
                </form>

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

                {allowCreateRoom ? (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    {t('or')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="lobby-create-room-password">
                                    {tRoom('roomPassword.label')}
                                </Label>
                                <Input
                                    id="lobby-create-room-password"
                                    type="password"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    placeholder={tRoom('roomPassword.placeholder')}
                                    {...roomSecretFieldProps}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                disabled={!isConnected}
                                className="w-full"
                                size="lg"
                                onClick={createRoom}
                            >
                                {tRoom('createRoom')}
                            </Button>
                        </div>
                    </>
                ) : null}
            </div>
            </div>
        </div>
    );
}
