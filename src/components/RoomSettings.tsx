import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';

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
            <div className="space-y-2">
                <h3 className="text-sm font-medium">Appearance</h3>
                <div className="flex items-center justify-between">
                    <label className="text-sm">Theme</label>
                    <ThemeToggle />
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-medium">Room Settings</h3>
                {room ? (
                    <div className="space-y-2">
                        <p className="text-sm">Room ID: {room.id}</p>
                        <Button onClick={leaveRoom}>Leave Room</Button>
                        {room.creatorId === room.clients[0] && (
                            <Button onClick={closeRoom}>Close Room</Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="space-y-2">
                            <Input
                                placeholder="Room Password (optional)"
                                type="password"
                                value={roomPassword}
                                onChange={(e) => setRoomPassword(e.target.value)}
                            />
                            <Button onClick={createRoom} disabled={!isConnected}>
                                Create Room
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Input
                                placeholder="Room ID"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value)}
                            />
                            <Input
                                placeholder="Room Password (optional)"
                                type="password"
                                value={joinRoomPassword}
                                onChange={(e) => setJoinRoomPassword(e.target.value)}
                            />
                            <Button onClick={joinRoom} disabled={!isConnected}>
                                Join Room
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
