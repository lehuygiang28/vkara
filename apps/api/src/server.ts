import { Elysia } from 'elysia';
import type { ElysiaWS } from 'elysia/ws';
import cors from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import serverTiming from '@elysiajs/server-timing';
import { rateLimit } from 'elysia-rate-limit';

import { bindRoomPublisher } from '@/modules/room/room-broadcast';
import { createRoomService } from '@/modules/room/room-service';
import { createRoomWsPlugin } from '@/plugins/room-ws.plugin';
import { scheduleCleanupJobs } from '@/queues/cleanup';
import { scheduleHourlyReportJob } from '@/queues/hourly-report';
import { createContextLogger } from '@/utils/logger';
import type { ServerMessage } from '@vkara/room';

import { isExperimentsEnabled } from '@vkara/env';

import { env } from './env';
import { redis } from './redis';
import { searchTiktokElysia, shutdownTikTokPool } from './tiktok';
import { searchYoutubeiElysia } from './youtubei';

const serverLogger = createContextLogger('Server');

export const wsConnections = new Map<string, ElysiaWS>();

export function sendToClient(ws: ElysiaWS, message: ServerMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        serverLogger.error('Failed to send message to client', { error, clientId: ws.id });
    }
}

const roomService = createRoomService({ wsConnections, sendToClient });

export const closeRoom = roomService.closeRoom;

export const wsServer = new Elysia({
    websocket: {
        idleTimeout: 960,
        maxPayloadLength: 1024 * 1024,
    },
})
    .on('start', ({ server }) => {
        bindRoomPublisher((topic, payload) => {
            server?.publish(topic, payload);
        });
        serverLogger.info('Server started');
        scheduleCleanupJobs().catch((error) => {
            serverLogger.error('Failed to schedule cleanup jobs', { error });
        });
        scheduleHourlyReportJob().catch((error) => {
            serverLogger.error('Failed to schedule hourly report job', { error });
        });
    })
    .on('stop', async () => {
        serverLogger.info('Server stop initiated');
        try {
            await shutdownTikTokPool().catch(() => {});
            await redis.quit();
            await wsServer.stop();
            serverLogger.info('Server stopped successfully');
        } catch (error) {
            serverLogger.error('Error during server shutdown', { error });
        }
    })
    .state('wsConnections', wsConnections)
    .use(
        createRoomWsPlugin({
            roomService,
            wsConnections,
            sendToClient,
        }),
    )
    .use(cors())
    .use(
        openapi({
            mapJsonSchema: {
                zod: (schema: ZodType) => zodToJsonSchema(schema),
            },
        }),
    )
    .use(serverTiming())
    .use(
        rateLimit({
            scoping: 'global',
            generator: (req, server) =>
                req.headers.get('CF-Connecting-IP') ?? server?.requestIP(req)?.address ?? '',
            max: 20,
            duration: 1000,
        }),
    )
    .use(searchYoutubeiElysia)
    .use(isExperimentsEnabled(env) ? searchTiktokElysia : new Elysia())
    .get('/health', () => ({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
    }))
    .listen(env.PORT);

process.on('beforeExit', async () => {
    serverLogger.info('Server stopping due to beforeExit event');
    await redis.quit().catch((error) => {
        serverLogger.error('Error closing Redis connection', { error });
    });
    await wsServer.stop().catch((error) => {
        serverLogger.error('Error stopping WebSocket server', { error });
    });
});

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
        serverLogger.info(`Server stopping due to ${signal} signal`);
        setTimeout(() => {
            serverLogger.warn('Forced exit after timeout');
            process.exit(1);
        }, 5000);

        try {
            await shutdownTikTokPool().catch(() => {});
            await redis.quit();
            await wsServer.stop();
            serverLogger.info('Clean shutdown completed');
            process.exit(0);
        } catch (error) {
            serverLogger.error('Error during shutdown', { error });
            process.exit(1);
        }
    });
});
