import { create } from 'zustand';
import { toast } from '@/hooks/use-toast';
import { ClientMessage, ServerMessage } from '@/types/websocket.type';

interface WebSocketState {
    sendMessage: (message: ClientMessage) => void;
    lastMessage: ServerMessage | null;
    connectionStatus: 'Connecting' | 'Open' | 'Closing' | 'Closed';
}

export const useWebSocketStore = create<WebSocketState>(() => ({
    sendMessage: () => {
        console.error('WebSocket not initialized');
    },
    lastMessage: null,
    connectionStatus: 'Closed',
}));

export const initializeWebSocket = (socketUrl: string) => {
    let socket: WebSocket | null = null;

    const connectWebSocket = () => {
        if (socket !== null) {
            return;
        }

        socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            useWebSocketStore.setState({ connectionStatus: 'Open' });
            toast({
                title: 'Connected to server',
                description: 'You are now connected to the WebSocket server.',
            });
        };

        socket.onclose = () => {
            useWebSocketStore.setState({ connectionStatus: 'Closed' });
            toast({
                title: 'Disconnected from server',
                description: 'Connection lost. Attempting to reconnect...',
                variant: 'destructive',
            });
            setTimeout(connectWebSocket, 5000);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            toast({
                title: 'Connection error',
                description: 'An error occurred with the WebSocket connection.',
                variant: 'destructive',
            });
        };

        socket.onmessage = (event) => {
            const message: ServerMessage = JSON.parse(event.data);
            useWebSocketStore.setState({ lastMessage: message });
        };

        useWebSocketStore.setState({
            sendMessage: (message: ClientMessage) => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(message));
                } else {
                    toast({
                        title: 'Connection error',
                        description: 'Unable to send message. Please check your connection.',
                        variant: 'destructive',
                    });
                }
            },
        });
    };

    connectWebSocket();

    return () => {
        if (socket) {
            socket.close();
        }
    };
};
