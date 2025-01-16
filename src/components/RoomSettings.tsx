'use client';

import React, { Suspense, useCallback, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';

import { useI18n, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useChangeLocale, useCurrentLocale, SUPPORTED_LOCALES } from '@/locales/client';

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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

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
    const changeLocale = useChangeLocale({ preserveSearchParams: true });
    const locale = useCurrentLocale();

    const isConnected = connectionStatus === 'OPEN';

    const t = useI18n();
    const t_RoomSettings = useScopedI18n('roomSettings');

    const createRoom = useCallback(() => {
        sendMessage({ type: 'createRoom', password: roomPassword });
    }, [roomPassword, sendMessage]);

    const joinRoom = useCallback(() => {
        sendMessage({ type: 'joinRoom', roomId: joinRoomId, password: joinRoomPassword });
    }, [joinRoomId, joinRoomPassword, sendMessage]);

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
                                        <span className="font-normal">{room.id}</span>
                                    </p>
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
                                                    layoutMode,
                                                })}
                                                readOnly
                                            />
                                            <Button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(
                                                        generateShareableUrl({
                                                            roomId: room.id,
                                                            password: roomPassword,
                                                        }),
                                                    );
                                                    toast({
                                                        title: t_RoomSettings('copyUrlSuccess'),
                                                    });
                                                }}
                                                className="ml-2"
                                            >
                                                {t_RoomSettings('copyUrl')}
                                            </Button>
                                        </div>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button className="w-full">
                                                {t_RoomSettings('leaveRoom')}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium leading-none">
                                                        {t_RoomSettings('confirmLeaveRoomTitle')}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t_RoomSettings('leaveRoomWarning')}
                                                    </p>
                                                </div>
                                                <div className="flex justify-end space-x-2">
                                                    <Button variant="outline" onClick={() => {}}>
                                                        {t_RoomSettings('cancel')}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={leaveRoom}
                                                    >
                                                        {t_RoomSettings('leaveRoom')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    {room.creatorId === wsId && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="destructive" className="w-full">
                                                    {t_RoomSettings('closeRoom')}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">
                                                            {t_RoomSettings(
                                                                'confirmCloseRoomTitle',
                                                            )}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {t_RoomSettings('closeRoomWarning')}
                                                        </p>
                                                    </div>
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {}}
                                                        >
                                                            {t_RoomSettings('cancel')}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            onClick={closeRoom}
                                                        >
                                                            {t_RoomSettings('closeRoom')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="create-room-password">
                                            {t_RoomSettings('roomPassword.label')}
                                        </Label>
                                        <Input
                                            id="create-room-password"
                                            type="password"
                                            value={roomPassword}
                                            onChange={(e) => setRoomPassword(e.target.value)}
                                            placeholder={t_RoomSettings('roomPassword.placeholder')}
                                        />
                                        <Button
                                            onClick={createRoom}
                                            disabled={!isConnected}
                                            className="w-full"
                                        >
                                            {t_RoomSettings('createRoom')}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="join-room-id">
                                            {t_RoomSettings('joinRoomId.label')}
                                        </Label>
                                        <Input
                                            id="join-room-id"
                                            value={joinRoomId}
                                            onChange={(e) => setJoinRoomId(e.target.value)}
                                            placeholder={t_RoomSettings('joinRoomId.placeholder')}
                                        />
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
                                            onClick={joinRoom}
                                            disabled={!isConnected}
                                            className="w-full"
                                        >
                                            {t_RoomSettings('joinRoom')}
                                        </Button>
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
                                    <SelectValue placeholder={t('youtubePage.selectLayoutMode')} />
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
                            <div className="mt-4">
                                <Label htmlFor="show-qr-in-player">
                                    {t_RoomSettings('showQRInPlayer')}
                                </Label>
                                <Select
                                    value={showQRInPlayer ? 'true' : 'false'}
                                    onValueChange={(value) => setShowQRInPlayer(value === 'true')}
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
                                    onValueChange={(value) => setOpacityOfButtonsInPlayer(value[0])}
                                />
                                <div className="text-sm text-muted-foreground">
                                    {opacityOfButtonsInPlayer}%
                                </div>
                            </div>
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
