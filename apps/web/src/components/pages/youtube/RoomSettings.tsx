'use client';

import React, { useCallback, useEffect } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { Eye, EyeOff, Copy } from 'lucide-react';

import { useI18n, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useWebSocket } from '@/providers/websocket-provider';
import { useJoinRoom } from '@/hooks/use-join-room';
import { useEffectiveLayoutMode } from '@/hooks/use-viewport-layout';
import { QRScanner } from '@/components/qr-scanner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { resolveRoomPasswordForShare } from '@vkara/shared-utils';
import { generateShareableUrl } from '@/lib/room-share';
import { toast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { TooltipButton } from '@/components/tooltip-button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from '@/components/ui/input-otp';

export function RoomSettings() {
    const {
        wsId,
        room,
        layoutMode,
        layoutModeSource,
        showQRInPlayer,
        showBottomControls,
        opacityOfButtonsInPlayer,
        setRoom,
        setLayoutMode,
        enableAutoLayoutMode,
        setCurrentTab,
        setShowQRInPlayer,
        setShowBottomControls,
        setOpacityOfButtonsInPlayer,
    } = useYouTubeStore();
    const { ensureConnectedAndSend, connectionStatus } = useWebSocket();
    const {
        roomPassword,
        showPassword,
        setRoomPassword,
        setShowPassword,
        resetJoinFormState,
        resetState,
    } = useRoomSettingsStore();
    const { joinRoom, joinFromScan, joinRoomId, setJoinRoomId, joinRoomPassword, setJoinRoomPassword } =
        useJoinRoom();
    const { effectiveLayoutMode } = useEffectiveLayoutMode();
    const isConnected = connectionStatus === 'OPEN';
    const isRemoteLayout = effectiveLayoutMode === 'remote';

    const t = useI18n();
    const t_RoomSettings = useScopedI18n('roomSettings');

    const sharePassword = room
        ? resolveRoomPasswordForShare(room.password, roomPassword)
        : roomPassword;

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

    useEffect(() => {
        return () => {
            resetState();
        };
    }, [resetState]);

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ScrollArea className="h-full" hideScrollbar>
                <div className="space-y-3 px-safe-offset pb-remote-scroll pt-safe-offset">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t_RoomSettings('title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {room ? (
                                <div className="space-y-4">
                                    <p className="text-sm font-medium">
                                        {t_RoomSettings('roomId')}:{' '}
                                        <span className="font-bold">
                                            {room.id?.slice(0, Math.round(room.id.length / 2)) +
                                                ' ' +
                                                room.id?.slice(-Math.round(room.id.length / 2))}
                                        </span>
                                    </p>
                                    {room?.id && room?.password && (
                                        <div className="space-y-2">
                                            <Label htmlFor="room-password">
                                                {t_RoomSettings('roomPassword.label')}
                                            </Label>
                                            <div className="flex">
                                                <Input
                                                    id="room-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={room.password || ''}
                                                    className="pr-20"
                                                    disabled
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="ml-2"
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
                                                        navigator.clipboard.writeText(
                                                            room.password || '',
                                                        );
                                                        toast({
                                                            title: t_RoomSettings(
                                                                'copyPasswordSuccess',
                                                            ),
                                                        });
                                                    }}
                                                    className="ml-2"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="shareable-qr-code">
                                            {t_RoomSettings('qrCode')}
                                        </Label>
                                        <div className="flex justify-center">
                                            <QRCode
                                                id="shareable-qr-code"
                                                value={generateShareableUrl({
                                                    roomId: room.id,
                                                    password: sharePassword,
                                                })}
                                                size={200}
                                                qrStyle="dots"
                                                eyeRadius={5}
                                                quietZone={2}
                                                ecLevel="L"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="shareable-url">
                                            {t_RoomSettings('shareableUrl')}
                                        </Label>
                                        <div className="flex">
                                            <Input
                                                id="shareable-url"
                                                value={generateShareableUrl({
                                                    roomId: room.id,
                                                    password: sharePassword,
                                                })}
                                                readOnly
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        generateShareableUrl({
                                                            roomId: room.id,
                                                            password: sharePassword,
                                                        }),
                                                    );
                                                    toast({
                                                        title: t_RoomSettings('copyUrlSuccess'),
                                                    });
                                                }}
                                                className="ml-2"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex space-x-3">
                                        <TooltipButton
                                            title={t_RoomSettings('leaveRoom')}
                                            buttonText={t_RoomSettings('leaveRoom')}
                                            tooltipContent={t_RoomSettings('leaveRoom')}
                                            onConfirm={leaveRoom}
                                            className="w-full"
                                            confirmMode
                                            confirmContent={
                                                <>
                                                    <h4 className="font-medium leading-none">
                                                        {t_RoomSettings('confirmLeaveRoomTitle')}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t_RoomSettings('leaveRoomWarning')}
                                                    </p>
                                                </>
                                            }
                                        />

                                        {room.creatorId === wsId && (
                                            <TooltipButton
                                                buttonText={t_RoomSettings('closeRoom')}
                                                tooltipContent={t_RoomSettings('closeRoom')}
                                                onConfirm={closeRoom}
                                                variant={'destructive'}
                                                className="w-full"
                                                confirmMode
                                                confirmContent={
                                                    <>
                                                        <h4 className="font-medium leading-none">
                                                            {t_RoomSettings(
                                                                'confirmCloseRoomTitle',
                                                            )}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {t_RoomSettings('closeRoomWarning')}
                                                        </p>
                                                    </>
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {!isRemoteLayout && (
                                        <div className="space-y-2">
                                            <Label htmlFor="create-room-password">
                                                {t_RoomSettings('roomPassword.label')}
                                            </Label>
                                            <Input
                                                id="create-room-password"
                                                type="password"
                                                value={roomPassword}
                                                onChange={(e) => setRoomPassword(e.target.value)}
                                                placeholder={t_RoomSettings(
                                                    'roomPassword.placeholder',
                                                )}
                                            />
                                            <Button
                                                onClick={createRoom}
                                                disabled={!isConnected}
                                                className="w-full"
                                            >
                                                {t_RoomSettings('createRoom')}
                                            </Button>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="join-room-id">
                                            {t_RoomSettings('joinRoomId.label')}
                                        </Label>
                                        <div className="flex flex-col items-center space-y-4">
                                            <InputOTP
                                                id="join-room-id"
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
                                            <p className="text-sm text-muted-foreground">
                                                {t_RoomSettings('joinRoomId.placeholder')}
                                            </p>
                                        </div>
                                        <Label htmlFor="join-room-password">
                                            {t_RoomSettings('joinRoomPassword.label')}
                                        </Label>
                                        <Input
                                            id="join-room-password"
                                            type="password"
                                            value={joinRoomPassword}
                                            onChange={(e) => setJoinRoomPassword(e.target.value)}
                                            placeholder={t_RoomSettings(
                                                'joinRoomPassword.placeholder',
                                            )}
                                        />
                                        <Button
                                            onClick={() => joinRoom()}
                                            disabled={!isConnected}
                                            className="w-full"
                                        >
                                            {t_RoomSettings('joinRoom')}
                                        </Button>
                                        <QRScanner
                                            onScan={joinFromScan}
                                            buttonClassName="w-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('youtubePage.layout')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Setting layout mode */}
                            <div className="mt-0 space-y-2">
                                <Label htmlFor="selectLayoutMode">
                                    {t('youtubePage.selectLayoutMode')}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {t('youtubePage.layoutAutoHint')}
                                </p>
                                <Select
                                    value={
                                        layoutModeSource === 'auto' ? 'auto' : layoutMode
                                    }
                                    onValueChange={(value) => {
                                        if (value === 'auto') {
                                            enableAutoLayoutMode();
                                            setCurrentTab('search');
                                            return;
                                        }
                                        const val = value as 'both' | 'remote' | 'player';
                                        setLayoutMode(val, 'user');
                                        if (val === 'remote') {
                                            setCurrentTab('search');
                                        } else if (val === 'player') {
                                            setCurrentTab('queue');
                                        }
                                    }}
                                >
                                    <SelectTrigger id="selectLayoutMode" className="mt-1 w-full">
                                        <SelectValue
                                            placeholder={t('youtubePage.selectLayoutMode')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">
                                            {t('youtubePage.layoutAuto')}
                                        </SelectItem>
                                        <SelectItem value="remote">
                                            {t('youtubePage.layoutRemote')}
                                        </SelectItem>
                                        <SelectItem value="player">
                                            {t('youtubePage.layoutPlayer')}
                                        </SelectItem>
                                        <SelectItem value="both">
                                            {t('youtubePage.layoutBoth')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Setting show QR in player */}
                            {layoutMode !== 'remote' && (
                                <div className="mt-4">
                                    <Label htmlFor="show-qr-in-player">
                                        {t_RoomSettings('showQRInPlayer')}
                                    </Label>
                                    <Select
                                        value={showQRInPlayer ? 'true' : 'false'}
                                        onValueChange={(value) =>
                                            setShowQRInPlayer(value === 'true')
                                        }
                                    >
                                        <SelectTrigger className="w-full mt-2">
                                            <SelectValue
                                                placeholder={t_RoomSettings('showQRInPlayer')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">
                                                {t_RoomSettings('show')}
                                            </SelectItem>
                                            <SelectItem value="false">
                                                {t_RoomSettings('hide')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Setting show bottom controls */}
                            {layoutMode === 'both' && (
                                <div className="mt-4">
                                    <Label htmlFor="show-bottom-controls">
                                        {t_RoomSettings('showBottomControls')}
                                    </Label>
                                    <Select
                                        value={showBottomControls ? 'true' : 'false'}
                                        onValueChange={(value) =>
                                            setShowBottomControls(value === 'true')
                                        }
                                    >
                                        <SelectTrigger className="w-full mt-2">
                                            <SelectValue
                                                placeholder={t_RoomSettings('showBottomControls')}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">
                                                {t_RoomSettings('show')}
                                            </SelectItem>
                                            <SelectItem value="false">
                                                {t_RoomSettings('hide')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Setting opacity of buttons in player */}
                            {layoutMode === 'player' && (
                                <div className="mt-4 space-y-2">
                                    <Label htmlFor="opacity-slider">
                                        {t_RoomSettings('opacityOfButtonsInPlayer')}
                                    </Label>
                                    <Slider
                                        id="opacity-slider"
                                        min={0}
                                        max={100}
                                        step={5}
                                        value={[opacityOfButtonsInPlayer]}
                                        onValueChange={(value) =>
                                            setOpacityOfButtonsInPlayer(value[0])
                                        }
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        {opacityOfButtonsInPlayer}%
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
