'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import {
    roomCodeFieldProps,
    roomCodeOtpSlotClassName,
    roomSecretFieldProps,
} from '@/lib/room-field-autofill';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useJoinRoom } from '@/hooks/use-join-room';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';

import { LanguageSwitcher } from '@/components/language-switcher';
import { LayoutModeSwitch, RECOVERY_MODE_CHOICES } from '@/components/layout-mode-switch';
import { QRScanner } from '@/components/qr-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type RemoteJoinLobbyProps = {
    allowCreateRoom?: boolean;
};

function JoinDivider({ label }: { label: string }) {
    return (
        <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/70" />
            </div>
            <div className="relative flex justify-center text-[11px] font-medium uppercase tracking-wider">
                <span className="bg-card px-3 text-muted-foreground">{label}</span>
            </div>
        </div>
    );
}

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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-safe-offset pt-safe-offset sm:max-w-[26rem] sm:px-5">
                <div className="mb-4 flex justify-end sm:mb-5">
                    <LanguageSwitcher />
                </div>

                <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
                    <div className="space-y-6 p-5 sm:p-6">
                        <header className="space-y-1.5 text-center">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                                {t('title')}
                            </h1>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {t('subtitle')}
                            </p>
                        </header>

                        <form
                            className="space-y-5"
                            autoComplete="off"
                            onSubmit={(event) => {
                                event.preventDefault();
                                joinRoom();
                            }}
                        >
                            <div className="space-y-2.5">
                                <Label htmlFor="lobby-join-room-id" className="text-sm">
                                    {t('roomIdLabel')}
                                </Label>
                                <div className="-mx-1 flex justify-center overflow-x-auto px-1 pb-0.5">
                                    <InputOTP
                                        id="lobby-join-room-id"
                                        maxLength={ROOM_ID_LENGTH}
                                        value={joinRoomId}
                                        onChange={setJoinRoomId}
                                        inputMode="numeric"
                                        {...roomCodeFieldProps}
                                    >
                                        <InputOTPGroup className="gap-2 sm:gap-2.5">
                                            <InputOTPSlot
                                                index={0}
                                                className={roomCodeOtpSlotClassName}
                                            />
                                            <InputOTPSlot
                                                index={1}
                                                className={roomCodeOtpSlotClassName}
                                            />
                                            <InputOTPSlot
                                                index={2}
                                                className={roomCodeOtpSlotClassName}
                                            />
                                            <InputOTPSlot
                                                index={3}
                                                className={roomCodeOtpSlotClassName}
                                            />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lobby-join-room-password" className="text-sm">
                                    {t('passwordLabel')}
                                </Label>
                                <Input
                                    id="lobby-join-room-password"
                                    type="password"
                                    value={joinRoomPassword}
                                    onChange={(e) => setJoinRoomPassword(e.target.value)}
                                    placeholder={t('passwordPlaceholder')}
                                    className="h-11"
                                    {...roomSecretFieldProps}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={!isConnected}
                                className="h-11 w-full text-base"
                                size="lg"
                            >
                                {t('joinButton')}
                            </Button>
                        </form>

                        <JoinDivider label={t('or')} />

                        <QRScanner onScan={joinFromScan} buttonClassName="h-11 w-full" />

                        {allowCreateRoom ? (
                            <>
                                <JoinDivider label={t('or')} />

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="lobby-create-room-password"
                                            className="text-sm"
                                        >
                                            {tRoom('roomPassword.label')}
                                        </Label>
                                        <Input
                                            id="lobby-create-room-password"
                                            type="password"
                                            value={roomPassword}
                                            onChange={(e) => setRoomPassword(e.target.value)}
                                            placeholder={tRoom('roomPassword.placeholder')}
                                            className="h-11"
                                            {...roomSecretFieldProps}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={!isConnected}
                                        className="h-11 w-full"
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

                <div className="mt-5 flex justify-center pb-1 sm:mt-6">
                    <LayoutModeSwitch tone="inline" choices={RECOVERY_MODE_CHOICES} />
                </div>
            </div>
        </div>
    );
}
