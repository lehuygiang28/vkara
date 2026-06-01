import { toast } from '@/hooks/use-toast';
import { useWebSocketStore } from '@/store/websocketStore';

export const SESSION_NOT_READY_TOAST_ID = 'session-not-ready';

export function isWebSocketOpen(): boolean {
    return useWebSocketStore.getState().connectionStatus === 'OPEN';
}

/**
 * Room-session feedback when WS is up but join/rejoin has not finished.
 * Skipped while disconnected — ConnectionStatusToast already covers reconnect.
 */
export function toastSessionNotReady(input: { title: string; description: string }): void {
    if (!isWebSocketOpen()) return;

    toast({
        id: SESSION_NOT_READY_TOAST_ID,
        title: input.title,
        description: input.description,
        variant: 'error',
    });
}
