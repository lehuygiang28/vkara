import React, { useState } from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function RoomSettings() {
    const { room, setRoom } = useYouTubeStore();
    const { sendMessage, connectionStatus } = useWebSocketStore();
    const [roomPassword, setRoomPassword] = useState<string>('');
    const [joinRoomId, setJoinRoomId] = useState<string>('');
    const [joinRoomPassword, setJoinRoomPassword] = useState<string>('');

    const isConnected = connectionStatus === 'Open';

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
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="theme-toggle">Theme</Label>
                        <ThemeToggle />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Room Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    {room ? (
                        <div className="space-y-4">
                            <p className="text-sm">Room ID: {room.id}</p>
                            <Button onClick={leaveRoom} className="w-full">
                                Leave Room
                            </Button>
                            {room.creatorId === room.clients[0] && (
                                <Button
                                    onClick={closeRoom}
                                    variant="destructive"
                                    className="w-full"
                                >
                                    Close Room
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-room-password">
                                    Room Password (optional)
                                </Label>
                                <Input
                                    id="create-room-password"
                                    type="password"
                                    value={roomPassword}
                                    onChange={(e) => setRoomPassword(e.target.value)}
                                    placeholder="Enter room password"
                                />
                                <Button
                                    onClick={createRoom}
                                    disabled={!isConnected}
                                    className="w-full"
                                >
                                    Create Room
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="join-room-id">Room ID</Label>
                                <Input
                                    id="join-room-id"
                                    value={joinRoomId}
                                    onChange={(e) => setJoinRoomId(e.target.value)}
                                    placeholder="Enter room ID"
                                />
                                <Label htmlFor="join-room-password">Room Password (optional)</Label>
                                <Input
                                    id="join-room-password"
                                    type="password"
                                    value={joinRoomPassword}
                                    onChange={(e) => setJoinRoomPassword(e.target.value)}
                                    placeholder="Enter room password"
                                />
                                <Button
                                    onClick={joinRoom}
                                    disabled={!isConnected}
                                    className="w-full"
                                >
                                    Join Room
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
