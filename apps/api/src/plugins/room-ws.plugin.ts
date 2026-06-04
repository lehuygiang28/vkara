import { Elysia } from 'elysia';
import type { ElysiaWS } from 'elysia/ws';

import { createRoomService, type RoomService } from '@/modules/room/room-service';
import { RoomError, type ServerMessage } from '@vkara/room';
import { wsClientMessageSchema } from '@vkara/validators/ws/client-message';
import { wsLogger, createContextLogger } from '@/utils/logger';

const pluginLogger = createContextLogger('RoomWsPlugin');

export type RoomWsPluginOptions = {
    roomService: RoomService;
    wsConnections: Map<string, ElysiaWS>;
    sendToClient: (ws: ElysiaWS, message: ServerMessage) => void;
};

function handleWsError(
    ws: ElysiaWS,
    sendToClient: RoomWsPluginOptions['sendToClient'],
    error: unknown,
) {
    if (error instanceof RoomError) {
        sendToClient(ws, {
            type: 'errorWithCode',
            code: error.code,
            message: error.message,
        });
        return;
    }

    sendToClient(ws, { type: 'error', message: 'An unexpected error occurred' });
    pluginLogger.error('Unexpected WebSocket error', {
        error,
        clientId: ws.id,
    });
}

export const createRoomWsPlugin = ({
    roomService,
    wsConnections,
    sendToClient,
}: RoomWsPluginOptions) =>
    new Elysia({ name: 'room-ws' }).ws('/ws', {
        body: wsClientMessageSchema,
        open(ws) {
            wsLogger.info('Client connected', { clientId: ws.id });
            wsConnections.set(ws.id, ws);
            sendToClient(ws, { type: 'pong' });
        },
        async close(ws) {
            wsLogger.info('Client disconnected', { clientId: ws.id });
            try {
                await roomService.leaveCurrentRoom(ws);
            } catch (error) {
                wsLogger.error('Error during client disconnect cleanup', {
                    clientId: ws.id,
                    error,
                });
            } finally {
                wsConnections.delete(ws.id);
            }
        },
        async message(ws, message) {
            try {
                await roomService.handleMessage(ws, message);
            } catch (error) {
                handleWsError(ws, sendToClient, error);
            }
        },
    });

export { createRoomService };
