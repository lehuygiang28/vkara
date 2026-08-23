import { Elysia } from 'elysia';
import type { ElysiaWS } from 'elysia/ws';
import cors, { type CORSConfig } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import serverTiming from '@elysiajs/server-timing';
import { rateLimit } from 'elysia-rate-limit';
import * as Sentry from '@sentry/elysia';

import { bindRoomPublisher } from '@/modules/room/room-broadcast';
import { createRoomService } from '@/modules/room/room-service';
import { createRoomWsPlugin } from '@/plugins/room-ws.plugin';
import { captureUnexpected, getServiceHealth } from '@/sentry';
import { createContextLogger } from '@/utils/logger';
import type { ServerMessage } from '@vkara/room';

import { applyTlsInsecureRuntime, isExperimentsEnabled, parseEnvFlagValue } from '@vkara/env';
import { resolveCorsConfig } from '@vkara/env/server';
import { readSentryEnvironmentFromProcess } from '@vkara/env/sentry';

import { env } from './env';
import { redis } from './redis';
import { searchTiktokElysia, shutdownTikTokPool, warmupTikTokPool } from './tiktok';
import { searchYoutubeiElysia } from './youtubei';

const serverLogger = createContextLogger('Server');

if (applyTlsInsecureRuntime(env)) {
    serverLogger.warn(
        'VKARA_TLS_INSECURE is enabled — outbound TLS certificate verification is disabled',
    );
}

export const wsConnections = new Map<string, ElysiaWS>();

export function sendToClient(ws: ElysiaWS, message: ServerMessage): void {
    try {
        ws.send(JSON.stringify(message));
    } catch (error) {
        serverLogger.error('Failed to send message to client', { error, clientId: ws.id });
        captureUnexpected(error, {
            tags: { area: 'ws', op: 'send' },
            extras: { clientId: ws.id, messageType: message.type },
            level: 'warning',
        });
    }
}

const roomService = createRoomService({ wsConnections, sendToClient });

export const closeRoom = roomService.closeRoom;

export const wsServer = Sentry.withElysia(
    new Elysia({
        websocket: {
            idleTimeout: 960,
            maxPayloadLength: 1024 * 1024,
        },
    }),
)
    .on('start', ({ server }) => {
        bindRoomPublisher((topic, payload) => {
            server?.publish(topic, payload);
        });
        serverLogger.info('Server started');
        if (isExperimentsEnabled(env)) {
            warmupTikTokPool();
        }
        // Dynamic import avoids a load-time cycle: queues import closeRoom/wsConnections from this module.
        void import('@/queues/cleanup')
            .then(({ scheduleCleanupJobs }) => scheduleCleanupJobs())
            .catch((error) => {
                serverLogger.error('Failed to schedule cleanup jobs', { error });
                captureUnexpected(error, {
                    tags: { area: 'queue', op: 'schedule', queue: 'room-cleanup' },
                });
            });
        void import('@/queues/hourly-report')
            .then(({ scheduleHourlyReportJob }) => scheduleHourlyReportJob())
            .catch((error) => {
                serverLogger.error('Failed to schedule hourly report job', { error });
                captureUnexpected(error, {
                    tags: { area: 'queue', op: 'schedule', queue: 'service-hourly-report' },
                });
            });
    })
    .on('stop', async () => {
        serverLogger.info('Server stop initiated');
        try {
            await shutdownTikTokPool().catch(() => {});
            await redis.quit();
            await Sentry.close(2000);
            serverLogger.info('Server stopped successfully');
        } catch (error) {
            serverLogger.error('Error during server shutdown', { error });
            captureUnexpected(error, { tags: { area: 'server', op: 'shutdown' } });
        }
    })
    .state('wsConnections', wsConnections)
    .use(cors(resolveCorsConfig(env.CORS_ORIGINS) satisfies CORSConfig))
    .use(
        createRoomWsPlugin({
            roomService,
            wsConnections,
            sendToClient,
            corsOrigins: env.CORS_ORIGINS,
        }),
    )
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
    .get('/health', async () =>
        getServiceHealth({
            redis,
            wsConnections: wsConnections.size,
        }),
    )
    .get('/debug-sentry', () => {
        // Never expose the verify route in Sentry production (vkara.vercel.app / VERCEL_ENV=production).
        const sentryEnvironment = readSentryEnvironmentFromProcess();
        if (
            sentryEnvironment === 'production' ||
            !parseEnvFlagValue(env.SENTRY_VERIFY, false)
        ) {
            return new Response('Not Found', { status: 404 });
        }
        throw new Error('Sentry test error — vkara-api');
    })
    .listen(env.PORT);

['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, async () => {
        serverLogger.info(`Server stopping due to ${signal} signal`);
        setTimeout(() => {
            serverLogger.warn('Forced exit after timeout');
            process.exit(1);
        }, 5000);

        try {
            // Cleanup runs in the `stop` lifecycle; do not re-run it here.
            await wsServer.stop();
            serverLogger.info('Clean shutdown completed');
            process.exit(0);
        } catch (error) {
            serverLogger.error('Error during shutdown', { error });
            captureUnexpected(error, { tags: { area: 'server', op: 'shutdown' } });
            process.exit(1);
        }
    });
});
