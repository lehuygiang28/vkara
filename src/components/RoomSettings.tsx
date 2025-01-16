'use client';

import React, { useCallback, useState } from 'react';
import { QRCode } from 'react-qrcode-logo';

import { useI18n, useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';

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

export function RoomSettings() {
    const { wsId, room, setRoom, layoutMode, setLayoutMode, setCurrentTab } = useYouTubeStore();
    const { sendMessage, connectionStatus } = useWebSocketStore();
    const [roomPassword, setRoomPassword] = useState<string>('');
    const [joinRoomId, setJoinRoomId] = useState<string>('');
    const [joinRoomPassword, setJoinRoomPassword] = useState<string>('');

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
                                                            layoutMode,
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
                                                    layoutMode,
                                                })}
                                                size={200}
                                                qrStyle="dots"
                                                eyeRadius={5}
                                                quietZone={2}
                                                ecLevel="L"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={leaveRoom} className="w-full">
                                        {t_RoomSettings('leaveRoom')}
                                    </Button>
                                    {room.creatorId === wsId && (
                                        <Button
                                            onClick={closeRoom}
                                            variant="destructive"
                                            className="w-full"
                                        >
                                            {t_RoomSettings('closeRoom')}
                                        </Button>
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
                                <SelectTrigger className="w-full">
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
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </div>
    );
}
