'use client';

import { useCallback } from 'react';

import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import { roomCodeFieldProps, roomCodeOtpSlotClassName, roomSecretFieldProps } from '@/lib/room-field-autofill';
import { useJoinRoom } from '@/hooks/use-join-room';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

type TvRoomLobbyProps = {
    onOpenSettingsAction?: () => void;
    compact?: boolean;
};

export function TvRoomLobby({ onOpenSettingsAction, compact = false }: TvRoomLobbyProps) {
    const t = useScopedI18n('tvLobby');
    const { connectionStatus, ensureConnectedAndSend } = useWebSocket();
    const { roomPassword, resetJoinFormState } = useRoomSettingsStore();
    const {
        joinRoom,
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

    const handleJoin = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            joinRoom();
        },
        [joinRoom],
    );

    return (
        <div
            className={
                compact
                    ? 'flex w-full max-w-md flex-col gap-6 px-4'
                    : 'flex w-full max-w-lg flex-col gap-8 px-6 sm:px-8'
            }
        >
            <div className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                    {t('title')}
                </h2>
                <p className="text-sm text-zinc-400 sm:text-base">{t('subtitle')}</p>
            </div>

            <div className="space-y-3">
                <Button
                    type="button"
                    size="lg"
                    disabled={!isConnected}
                    className="h-12 w-full text-base"
                    onClick={createRoom}
                >
                    {t('createButton')}
                </Button>
                {onOpenSettingsAction ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-zinc-400 hover:text-zinc-200"
                        onClick={onOpenSettingsAction}
                    >
                        {t('openSettings')}
                    </Button>
                ) : null}
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    <span className="bg-zinc-950 px-3 text-zinc-500">{t('or')}</span>
                </div>
            </div>

            <form className="space-y-4" autoComplete="off" onSubmit={handleJoin}>
                <div className="space-y-2">
                    <Label htmlFor="tv-lobby-room-id" className="text-zinc-300">
                        {t('roomIdLabel')}
                    </Label>
                    <div className="flex justify-center">
                        <InputOTP
                            id="tv-lobby-room-id"
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
                    <Label htmlFor="tv-lobby-room-password" className="text-zinc-300">
                        {t('passwordLabel')}
                    </Label>
                    <Input
                        id="tv-lobby-room-password"
                        type="password"
                        value={joinRoomPassword}
                        onChange={(e) => setJoinRoomPassword(e.target.value)}
                        placeholder={t('passwordPlaceholder')}
                        className="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                        {...roomSecretFieldProps}
                    />
                </div>

                <Button
                    type="submit"
                    variant="secondary"
                    disabled={!isConnected || !isValidRoomId(joinRoomId)}
                    className="h-11 w-full"
                >
                    {t('joinButton')}
                </Button>
            </form>
        </div>
    );
}
