'use client';

import { useEffect, useRef, useState } from 'react';

import type { ConnectionStatus } from '@/types/websocket.type';
import { useWebSocketStore } from '@/store/websocketStore';

const SHOW_DELAY_MS = 500;
const HIDE_DELAY_MS = 800;

type ConnectionUiPhase = 'hidden' | 'connecting' | 'offline';

function toUiPhase(status: ConnectionStatus, visible: boolean): ConnectionUiPhase {
    if (!visible || status === 'OPEN') {
        return 'hidden';
    }
    if (status === 'CONNECTING') {
        return 'connecting';
    }
    return 'offline';
}

/**
 * Debounces connection status for display so brief reconnect blips do not flicker the UI.
 */
export function useConnectionStatusUi() {
    const connectionStatus = useWebSocketStore((state) => state.connectionStatus);
    const isOpen = connectionStatus === 'OPEN';
    const [visible, setVisible] = useState(false);
    const [displayStatus, setDisplayStatus] = useState<ConnectionStatus>(connectionStatus);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (showTimerRef.current) {
            clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (!isOpen) {
            setDisplayStatus(connectionStatus);
            showTimerRef.current = setTimeout(() => {
                setVisible(true);
            }, SHOW_DELAY_MS);
            return () => {
                if (showTimerRef.current) {
                    clearTimeout(showTimerRef.current);
                }
            };
        }

        hideTimerRef.current = setTimeout(() => {
            setVisible(false);
        }, HIDE_DELAY_MS);

        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [connectionStatus, isOpen]);

    useEffect(() => {
        if (visible && !isOpen) {
            setDisplayStatus(connectionStatus);
        }
    }, [connectionStatus, isOpen, visible]);

    const phase = toUiPhase(displayStatus, visible);

    return {
        phase,
        visible: phase !== 'hidden',
        isConnecting: phase === 'connecting',
    };
}
