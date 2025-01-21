'use client';

import React, { Suspense, useCallback, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

import { useI18n, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useChangeLocale, useCurrentLocale, type SUPPORTED_LOCALES } from '@/locales/client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateShareableUrl } from '@/lib/utils';
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
        showQRInPlayer,
        showBottomControls,
        opacityOfButtonsInPlayer,
        setRoom,
        setLayoutMode,
        setCurrentTab,
        setShowQRInPlayer,
        setShowBottomControls,
        setOpacityOfButtonsInPlayer,
    } = useYouTubeStore();
    const { sendMessage, connectionStatus } = useWebSocketStore();
    const [roomPassword, setRoomPassword] = useState<string>('');
    const [joinRoomId, setJoinRoomId] = useState<string>('');
    const [joinRoomPassword, setJoinRoomPassword] = useState<string>('');
    const [showJoinPassword, setShowJoinPassword] = useState(false);
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const changeLocale = useChangeLocale({ preserveSearchParams: true });
    const locale = useCurrentLocale();

    const isConnected = connectionStatus === 'OPEN';

    const t = useI18n();
    const t_RoomSettings = useScopedI18n('roomSettings');

    const createRoom = useCallback(() => {
        sendMessage({ type: 'createRoom', password: roomPassword });
    }, [roomPassword, sendMessage]);

    const joinRoom = useCallback(() => {
        if (joinRoomId.length === 6) {
            sendMessage({
                type: 'joinRoom',
                roomId: joinRoomId,
                password: joinRoomPassword,
            });
        } else {
            toast({
                title: t_RoomSettings('invalidRoomId'),
                description: t_RoomSettings('roomIdMustBe6Digits'),
                variant: 'destructive',
            });
        }
    }, [joinRoomId, joinRoomPassword, sendMessage, t_RoomSettings]);

    const leaveRoom = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'leaveRoom' });
            setRoom(null);
        }
    }, [sendMessage, room?.id, setRoom]);

    const closeRoom = useCallback(() => {
        if (room?.id) {
            sendMessage({ type: 'closeRoom' });
            setRoom(null);
        }
    }, [sendMessage, room?.id, setRoom]);

    return (
        <div className="flex flex-col h-screen">
            <ScrollArea className="h-full" hideScrollbar>
                <div className="space-y-3 pb-[20rem]">
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
                                                    password: room?.password || '',
                                                    layoutMode: 'remote',
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
                                                    password: roomPassword,
                                                    layoutMode: 'remote',
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
                                                            password: roomPassword,
                                                            layoutMode: 'remote',
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
                                    <div className="flex space-x-4">
                                        <Button
                                            onClick={() => {
                                                setShowCreateRoom(true);
                                                setShowJoinRoom(false);
                                            }}
                                            className="w-full"
                                        >
                                            {t_RoomSettings('createRoom')}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setShowJoinRoom(true);
                                                setShowCreateRoom(false);
                                            }}
                                            className="w-full"
                                        >
                                            {t_RoomSettings('joinRoom')}
                                        </Button>
                                    </div>

                                    {showCreateRoom && (
                                        <Card>
                                            <CardContent className="space-y-4 mt-4">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="use-create-password"
                                                        checked={showCreatePassword}
                                                        onCheckedChange={setShowCreatePassword}
                                                    />
                                                    <Label htmlFor="use-create-password">
                                                        {t_RoomSettings('usePassword')}
                                                    </Label>
                                                </div>
                                                {showCreatePassword && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="create-room-password">
                                                            {t_RoomSettings('roomPassword.label')}
                                                        </Label>
                                                        <Input
                                                            id="create-room-password"
                                                            type="password"
                                                            value={roomPassword}
                                                            onChange={(e) =>
                                                                setRoomPassword(e.target.value)
                                                            }
                                                            placeholder={t_RoomSettings(
                                                                'roomPassword.placeholder',
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={createRoom}
                                                    disabled={!isConnected}
                                                    className="w-full"
                                                >
                                                    {t_RoomSettings('createRoom')}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {showJoinRoom && (
                                        <Card>
                                            <CardContent className="space-y-4 mt-4">
                                                <Label htmlFor="join-room-id">
                                                    {t_RoomSettings('joinRoomId.label')}
                                                </Label>
                                                <div className="flex flex-col items-center space-y-4">
                                                    <InputOTP
                                                        maxLength={6}
                                                        value={joinRoomId}
                                                        onChange={setJoinRoomId}
                                                        type="number"
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
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="use-join-password"
                                                        checked={showJoinPassword}
                                                        onCheckedChange={setShowJoinPassword}
                                                    />
                                                    <Label htmlFor="use-join-password">
                                                        {t_RoomSettings('usePassword')}
                                                    </Label>
                                                </div>
                                                {showJoinPassword && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="join-room-password">
                                                            {t_RoomSettings(
                                                                'joinRoomPassword.label',
                                                            )}
                                                        </Label>
                                                        <Input
                                                            id="join-room-password"
                                                            type="password"
                                                            value={joinRoomPassword}
                                                            onChange={(e) =>
                                                                setJoinRoomPassword(e.target.value)
                                                            }
                                                            placeholder={t_RoomSettings(
                                                                'joinRoomPassword.placeholder',
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={joinRoom}
                                                    disabled={!isConnected}
                                                    className="w-full"
                                                >
                                                    {t_RoomSettings('joinRoom')}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}
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
                            <div className="mt-0">
                                <Label htmlFor="selectLayoutMode">
                                    {t('youtubePage.selectLayoutMode')}
                                </Label>
                                <Select
                                    value={layoutMode}
                                    onValueChange={(value) => {
                                        const val = value as 'both' | 'remote' | 'player';
                                        setLayoutMode(val);
                                        if (val === 'remote') {
                                            setCurrentTab('controls');
                                        } else if (val === 'player') {
                                            setCurrentTab('queue');
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full mt-2">
                                        <SelectValue
                                            placeholder={t('youtubePage.selectLayoutMode')}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="both">
                                            {t('youtubePage.layoutBoth')}
                                        </SelectItem>
                                        <SelectItem value="remote">
                                            {t('youtubePage.layoutRemote')}
                                        </SelectItem>
                                        <SelectItem value="player">
                                            {t('youtubePage.layoutPlayer')}
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
                            {(layoutMode === 'player' || layoutMode === 'both') && (
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
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('appearance.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="theme-toggle">{t('appearance.theme')}</Label>
                                <ThemeToggle />
                            </div>
                            <Suspense>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                                    <Label
                                        htmlFor="language-chooser"
                                        className="text-sm font-medium flex items-center"
                                    >
                                        {t('appearance.language')}
                                    </Label>
                                    <Select
                                        value={locale}
                                        onValueChange={(value: SUPPORTED_LOCALES) => {
                                            changeLocale(value);
                                        }}
                                    >
                                        <SelectTrigger className="flex items-center justify-between w-full sm:w-auto border rounded-md px-3 py-2 min-w-[12rem]">
                                            <SelectValue placeholder={t('appearance.language')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">
                                                <span>{t('appearance.languageEnglish')}</span>
                                            </SelectItem>
                                            <SelectItem value="vi">
                                                <span>{t('appearance.languageVietnamese')}</span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
