import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import type { Room } from '@vkara/room';

import { createRedisOptions } from '@vkara/redis';

import { env } from '@/env';
import { emitHourlyReport } from '@/modules/stats/service-stats';
import { wsConnections } from '@/server';
import { createContextLogger } from '@/utils/logger';
import { scanRedisKeys } from '@/utils/room-store';

const logger = createContextLogger('Queue/Report');

const REPORT_CRON_PATTERN = env.SERVICE_REPORT_CRON;

const connectionOptions = createRedisOptions({
    REDIS_HOST: env.REDIS_HOST,
    REDIS_PORT: String(env.REDIS_PORT),
    REDIS_PASSWORD: env.REDIS_PASSWORD,
});

const connection = new Redis(connectionOptions);

export const hourlyReportQueue = new Queue('service-hourly-report', {
    connection: connectionOptions,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});

const worker = new Worker(
    'service-hourly-report',
    async () => {
        const snapshot = await collectServiceSnapshot();
        emitHourlyReport(snapshot);
    },
    {
        connection: connectionOptions,
        concurrency: 1,
    },
);

worker.on('completed', (job) => {
    logger.debug(`Report job ${job.id} has completed`, { jobId: job.id });
});

worker.on('failed', (job, error) => {
    logger.error(`Report job ${job?.id} has failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

async function collectServiceSnapshot() {
    const roomKeys = await scanRedisKeys('room:*');
    let activeRooms = 0;

    for (const key of roomKeys) {
        const roomData = await connection.get(key);
        if (!roomData) {
            continue;
        }

        try {
            const room: Room = JSON.parse(roomData);
            const hasConnectedClient = (room.clients || []).some((clientId) =>
                wsConnections.has(clientId),
            );
            if (hasConnectedClient) {
                activeRooms++;
            }
        } catch {
            // skip malformed room payloads
        }
    }

    const clientKeys = await scanRedisKeys('client:*');

    return {
        totalRooms: roomKeys.length,
        activeRooms,
        totalClientRecords: clientKeys.length,
        connectedClients: wsConnections.size,
    };
}

export async function scheduleHourlyReportJob() {
    try {
        await hourlyReportQueue.add(
            'hourly-report',
            {},
            {
                repeat: {
                    pattern: REPORT_CRON_PATTERN,
                },
            },
        );
        logger.info(`Scheduled service report (cron: ${REPORT_CRON_PATTERN})`);
    } catch (error) {
        logger.error('Failed to schedule hourly report job', { error });
        throw error;
    }
}
