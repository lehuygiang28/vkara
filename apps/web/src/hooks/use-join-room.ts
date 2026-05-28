'use client';

import { useCallback } from 'react';

import { parseRoomFromScan } from '@/lib/room-payload';
import { useScopedI18n } from '@/locales/client';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { toast } from '@/hooks/use-toast';

export function useJoinRoom() {
    const t = useScopedI18n('roomSettings');
    const { ensureConnectedAndSend } = useWebSocket();
    const {
        joinRoomId,
        joinRoomPassword,
        setJoinRoomId,
        setJoinRoomPassword,
        resetState,
    } = useRoomSettingsStore();

    const joinRoom = useCallback(
        (data?: { roomId?: string; password?: string | null }) => {
            const roomIdWillUse = data?.roomId ?? joinRoomId;
            if (roomIdWillUse.length === 6) {
                ensureConnectedAndSend({
                    type: 'joinRoom',
                    roomId: roomIdWillUse,
                    password: data?.password || joinRoomPassword || undefined,
                });
                resetState();
            } else {
                toast({
                    title: t('invalidRoomId'),
                    description: t('roomIdMustBe6Digits'),
                    variant: 'error',
                });
            }
        },
        [joinRoomId, joinRoomPassword, ensureConnectedAndSend, t, resetState],
    );

    const joinFromScan = useCallback(
        (text: string) => {
            const parsed = parseRoomFromScan(text);
            if (!parsed) {
                toast({
                    title: t('invalidRoomId'),
                    description: t('roomIdMustBe6Digits'),
                    variant: 'error',
                });
                return;
            }
            if (parsed.password !== undefined) {
                setJoinRoomPassword(parsed.password);
            }
            setJoinRoomId(parsed.roomId);
            joinRoom({ roomId: parsed.roomId, password: parsed.password ?? joinRoomPassword });
        },
        [joinRoom, joinRoomPassword, setJoinRoomId, setJoinRoomPassword, t],
    );

    return {
        joinRoom,
        joinFromScan,
        joinRoomId,
        joinRoomPassword,
        setJoinRoomId,
        setJoinRoomPassword,
    };
}
