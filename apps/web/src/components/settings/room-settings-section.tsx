'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { Copy, Eye, EyeOff } from 'lucide-react';

import {
    SettingsActions,
    SettingsBlock,
    SettingsGroup,
    SettingsSection,
    SettingsSubheader,
} from '@/components/settings/settings-section';
import { SettingsRow } from '@/components/settings/settings-row';
import { QRScanner } from '@/components/qr-scanner';
import { TooltipButton } from '@/components/tooltip-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCurrentLocale, useI18n, useScopedI18n } from '@/locales/client';
import { useJoinRoom } from '@/hooks/use-join-room';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { toast } from '@/hooks/use-toast';
import { toastSessionNotReady } from '@/lib/session-toast';
import { generateShareableUrl } from '@/lib/room-share';
import { roomCodeFieldProps, roomCodeOtpSlotClassName, roomSecretFieldProps } from '@/lib/room-field-autofill';
import { resolveRoomPasswordForShare, ROOM_ID_LENGTH } from '@vkara/shared-utils';

type RoomSettingsSectionProps = {
    isRemoteLayout: boolean;
};

export function RoomSettingsSection({ isRemoteLayout }: RoomSettingsSectionProps) {
    const { wsId, room, setRoom } = useYouTubeStore();
    const { ensureConnectedAndSend, connectionStatus } = useWebSocket();
    const {
        roomPassword,
        showPassword,
        setRoomPassword,
        setShowPassword,
        resetJoinFormState,
    } = useRoomSettingsStore();
    const { joinRoom, joinFromScan, joinRoomId, setJoinRoomId, joinRoomPassword, setJoinRoomPassword } =
        useJoinRoom();

    const t = useI18n();
    const tRoom = useScopedI18n('roomSettings');
    const tSections = useScopedI18n('settingsSections');
    const locale = useCurrentLocale();
    const isConnected = connectionStatus === 'OPEN';

    const sharePassword = room
        ? resolveRoomPasswordForShare(room.password, roomPassword)
        : roomPassword;
    const showQRInPlayer = room?.showQRInPlayer ?? true;

    const shareableUrl = useMemo(
        () =>
            room
                ? generateShareableUrl({
                      roomId: room.id,
                      password: sharePassword,
                      locale,
                  })
                : '',
        [locale, room, sharePassword],
    );

    const handleShowQRInPlayerChange = useCallback(
        (value: string) => {
            if (!room?.id) {
                toastSessionNotReady({
                    title: t('toast.sessionNotReady'),
                    description: t('toast.sessionNotReadyDescription'),
                });
                return;
            }

            ensureConnectedAndSend({
                type: 'setShowQRInPlayer',
                show: value === 'true',
            });
        },
        [room?.id, ensureConnectedAndSend, t],
    );

    const createRoom = useCallback(() => {
        const password = roomPassword.trim();
        ensureConnectedAndSend({
            type: 'createRoom',
            password: password || undefined,
        });
        resetJoinFormState();
    }, [roomPassword, ensureConnectedAndSend, resetJoinFormState]);

    useEffect(() => {
        if (room?.password) {
            setRoomPassword(room.password);
        }
    }, [room?.id, room?.password, setRoomPassword]);

    const leaveRoom = useCallback(() => {
        if (room?.id) {
            ensureConnectedAndSend({ type: 'leaveRoom' });
            setRoom(null);
        }
    }, [ensureConnectedAndSend, room?.id, setRoom]);

    const closeRoom = useCallback(() => {
        if (room?.id) {
            ensureConnectedAndSend({ type: 'closeRoom' });
            setRoom(null);
        }
    }, [ensureConnectedAndSend, room?.id, setRoom]);

    return (
        <SettingsSection
            title={tSections('room')}
            hint={room ? tSections('roomHint') : tSections('connectHint')}
            scope={room ? 'room' : undefined}
            scopeLabel={room ? tSections('scopeRoom') : undefined}
        >
            {room ? (
                <>
                    <SettingsGroup>
                        <SettingsBlock>
                            <div className="space-y-1 text-center">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {tRoom('roomId')}
                                </p>
                                <p className="font-mono text-3xl font-semibold tabular-nums">{room.id}</p>
                            </div>

                            {room.password ? (
                                <div className="space-y-2">
                                    <Label htmlFor="room-password">{tRoom('roomPassword.label')}</Label>
                                    <div className="flex">
                                        <Input
                                            id="room-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={room.password}
                                            className="pr-20"
                                            disabled
                                            readOnly
                                            {...roomSecretFieldProps}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="ml-2"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                navigator.clipboard.writeText(room.password || '');
                                                toast({
                                                    title: tRoom('copyPasswordSuccess'),
                                                    variant: 'success',
                                                    duration: 1800,
                                                });
                                            }}
                                            className="ml-2"
                                            aria-label="Copy password"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </SettingsBlock>

                        <SettingsSubheader>{tSections('invite')}</SettingsSubheader>
                        <SettingsBlock>
                            <div className="flex justify-center">
                                <QRCode
                                    value={shareableUrl}
                                    size={180}
                                    qrStyle="dots"
                                    eyeRadius={5}
                                    quietZone={2}
                                    ecLevel="L"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="shareable-url">{tRoom('shareableUrl')}</Label>
                                <div className="flex">
                                    <Input
                                        id="shareable-url"
                                        value={shareableUrl}
                                        readOnly
                                        autoComplete="off"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            navigator.clipboard.writeText(shareableUrl);
                                            toast({
                                                title: tRoom('copyUrlSuccess'),
                                                variant: 'success',
                                                duration: 1800,
                                            });
                                        }}
                                        className="ml-2"
                                        aria-label="Copy URL"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </SettingsBlock>

                        <SettingsRow
                            label={tRoom('showQRInPlayer')}
                            htmlFor="show-qr-in-player"
                            control={
                                <Select
                                    value={showQRInPlayer ? 'true' : 'false'}
                                    onValueChange={handleShowQRInPlayerChange}
                                >
                                    <SelectTrigger id="show-qr-in-player" className="w-[7.5rem]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">{tRoom('show')}</SelectItem>
                                        <SelectItem value="false">{tRoom('hide')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            }
                        />
                    </SettingsGroup>

                    <SettingsActions>
                        <TooltipButton
                            title={tRoom('leaveRoom')}
                            buttonText={tRoom('leaveRoom')}
                            tooltipContent={tRoom('leaveRoom')}
                            onConfirm={leaveRoom}
                            className="w-full"
                            confirmMode
                            confirmContent={
                                <>
                                    <h4 className="font-medium leading-none">
                                        {tRoom('confirmLeaveRoomTitle')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {tRoom('leaveRoomWarning')}
                                    </p>
                                </>
                            }
                        />
                        {room.creatorId === wsId ? (
                            <TooltipButton
                                buttonText={tRoom('closeRoom')}
                                tooltipContent={tRoom('closeRoom')}
                                onConfirm={closeRoom}
                                variant="destructive"
                                className="w-full"
                                confirmMode
                                confirmContent={
                                    <>
                                        <h4 className="font-medium leading-none">
                                            {tRoom('confirmCloseRoomTitle')}
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                            {tRoom('closeRoomWarning')}
                                        </p>
                                    </>
                                }
                            />
                        ) : null}
                    </SettingsActions>
                </>
            ) : (
                <SettingsGroup>
                    <SettingsBlock>
                        <div className="space-y-2">
                            <Label htmlFor="join-room-id">{tRoom('joinRoomId.label')}</Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    id="join-room-id"
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
                            <Label htmlFor="join-room-password">{tRoom('joinRoomPassword.label')}</Label>
                            <Input
                                id="join-room-password"
                                type="password"
                                value={joinRoomPassword}
                                onChange={(e) => setJoinRoomPassword(e.target.value)}
                                placeholder={tRoom('joinRoomPassword.placeholder')}
                                {...roomSecretFieldProps}
                            />
                        </div>
                        <Button
                            onClick={() => joinRoom()}
                            disabled={!isConnected}
                            className="w-full"
                        >
                            {tRoom('joinRoom')}
                        </Button>
                        <QRScanner onScan={joinFromScan} buttonClassName="w-full" />
                    </SettingsBlock>

                    {!isRemoteLayout ? (
                        <>
                            <SettingsSubheader>{tSections('createRoom')}</SettingsSubheader>
                            <SettingsBlock>
                                <div className="space-y-2">
                                    <Label htmlFor="create-room-password">{tRoom('roomPassword.label')}</Label>
                                    <Input
                                        id="create-room-password"
                                        type="password"
                                        value={roomPassword}
                                        onChange={(e) => setRoomPassword(e.target.value)}
                                        placeholder={tRoom('roomPassword.placeholder')}
                                        {...roomSecretFieldProps}
                                    />
                                </div>
                                <Button
                                    onClick={createRoom}
                                    disabled={!isConnected}
                                    className="w-full"
                                >
                                    {tRoom('createRoom')}
                                </Button>
                            </SettingsBlock>
                        </>
                    ) : null}
                </SettingsGroup>
            )}
        </SettingsSection>
    );
}
