'use client';

import { useCallback } from 'react';

import { isValidRoomId } from '@vkara/shared-utils';

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
        resetJoinFormState,
    } = useRoomSettingsStore();

    const joinRoom = useCallback(
        (data?: { roomId?: string; password?: string | null }) => {
            const roomIdWillUse = data?.roomId ?? joinRoomId;
            if (isValidRoomId(roomIdWillUse)) {
                ensureConnectedAndSend({
                    type: 'joinRoom',
                    roomId: roomIdWillUse,
                    password: data?.password || joinRoomPassword || undefined,
                });
                resetJoinFormState();
            } else {
                toast({
                    title: t('invalidRoomId'),
                    description: t('roomIdMustBe4Digits'),
                    variant: 'error',
                });
            }
        },
        [joinRoomId, joinRoomPassword, ensureConnectedAndSend, t, resetJoinFormState],
    );

    const joinFromScan = useCallback(
        (text: string) => {
            const parsed = parseRoomFromScan(text);
            if (!parsed) {
                toast({
                    title: t('invalidRoomId'),
                    description: t('roomIdMustBe4Digits'),
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
