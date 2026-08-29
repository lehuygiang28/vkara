import { useWebSocketStore } from '@/store/websocketStore';
import type { RawClientMessage } from '@vkara/room';

export async function mintJoinTokenFromWs(
    send: (message: RawClientMessage) => void,
    timeoutMs = 4000,
): Promise<string | undefined> {
    const baseline = useWebSocketStore.getState().lastMessage;
    return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
            unsubscribe();
            resolve(undefined);
        }, timeoutMs);

        const unsubscribe = useWebSocketStore.subscribe((state) => {
            const message = state.lastMessage;
            if (!message || message === baseline || message.type !== 'joinTokenMinted') {
                return;
            }
            window.clearTimeout(timer);
            unsubscribe();
            resolve(message.joinToken);
        });

        send({ type: 'mintJoinToken' });
    });
}
