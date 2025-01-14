'use client';

import React, { useState } from 'react';

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

export function RoomSettings() {
    const { room, setRoom, layoutMode, setLayoutMode } = useYouTubeStore();
    const { sendMessage, connectionStatus } = useWebSocketStore();
    const [roomPassword, setRoomPassword] = useState<string>('');
    const [joinRoomId, setJoinRoomId] = useState<string>('');
    const [joinRoomPassword, setJoinRoomPassword] = useState<string>('');

    const isConnected = connectionStatus === 'OPEN';

    const t = useI18n();
    const t_RoomSettings = useScopedI18n('roomSettings');

    const createRoom = () => {
        sendMessage({ type: 'createRoom', password: roomPassword });
    };

    const joinRoom = () => {
        sendMessage({ type: 'joinRoom', roomId: joinRoomId, password: joinRoomPassword });
    };

    const leaveRoom = () => {
        if (room) {
            sendMessage({ type: 'leaveRoom' });
            setRoom(null);
        }
    };

    const closeRoom = () => {
        if (room) {
            sendMessage({ type: 'closeRoom' });
            setRoom(null);
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <ScrollArea className="h-full">
                <div className="space-y-3 pb-[12rem]">
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
                                    <Button onClick={leaveRoom} className="w-full">
                                        {t_RoomSettings('leaveRoom')}
                                    </Button>
                                    {room.creatorId === room.clients[0] && (
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
                                onValueChange={(value) =>
                                    setLayoutMode(value as 'both' | 'remote' | 'player')
                                }
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
