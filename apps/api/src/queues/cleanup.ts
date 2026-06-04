import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';
import type { Room } from '@vkara/room';

import { createRedisOptions } from '@vkara/redis';

import { env } from '@/env';
import { recordOrphanedClientsRemoved, recordRoomReleased } from '@/modules/stats/service-stats';
import { closeRoom, wsConnections } from '@/server';
import { createContextLogger } from '@/utils/logger';
import { scanRedisKeys } from '@/utils/room-store';

const EMPTY_ROOM_TIMEOUT = env.EMPTY_ROOM_TIMEOUT * 1000;
const ORPHANED_CLIENT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

const logger = createContextLogger('Queue/Cleanup');

const connectionOptions = createRedisOptions({
    REDIS_HOST: env.REDIS_HOST,
    REDIS_PORT: String(env.REDIS_PORT),
    REDIS_PASSWORD: env.REDIS_PASSWORD,
});
const connection = new Redis(connectionOptions);

// Create the cleanup queue
export const cleanupQueue = new Queue('room-cleanup', {
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

// Create a worker to process cleanup jobs
const worker = new Worker(
    'room-cleanup',
    async () => await cleanupInactiveRooms(),
    {
        connection: connectionOptions,
        concurrency: 1,
    },
);

// Handle worker events
worker.on('completed', (job) => {
    logger.debug(`Job ${job.id} (${job.name}) has completed`, { jobId: job.id });
});

worker.on('failed', (job, error) => {
    logger.error(`Job ${job?.id} (${job?.name}) has failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

function getConnectedClientIds(room: Room): string[] {
    return (room.clients || []).filter((clientId) => wsConnections.has(clientId));
}

/**
 * Releases rooms that have had no connected clients for EMPTY_ROOM_TIMEOUT (default 1 hour).
 * Rooms with at least one active WebSocket connection are never released by this job.
 */
async function cleanupInactiveRooms() {
    const keys = await scanRedisKeys('room:*');
    const now = Date.now();
    logger.debug(`Starting cleanup check for ${keys.length} rooms`);
    let cleanedRoomsCount = 0;

    for (const key of keys) {
        const roomData = await connection.get(key);
        if (!roomData) {
            logger.warn(`Room data not found for key: ${key}`);
            continue;
        }

        try {
            const room: Room = JSON.parse(roomData);
            const connectedClientIds = getConnectedClientIds(room);
            let roomChanged = false;

            if (connectedClientIds.length > 0) {
                if (connectedClientIds.length !== room.clients.length) {
                    room.clients = connectedClientIds;
                    roomChanged = true;
                }
                if (room.emptySince !== undefined) {
                    delete room.emptySince;
                    roomChanged = true;
                }
                if (roomChanged) {
                    await connection.set(key, JSON.stringify(room));
                }
                continue;
            }

            if (room.clients.length > 0) {
                room.clients = [];
                roomChanged = true;
            }

            if (!room.emptySince) {
                // Legacy rooms with no clients: use lastActivity so we do not reset the 1h grace period.
                room.emptySince =
                    room.clients.length === 0 && room.lastActivity ? room.lastActivity : now;
                roomChanged = true;
            }

            if (roomChanged) {
                await connection.set(key, JSON.stringify(room));
            }

            const emptySince = room.emptySince ?? room.lastActivity;
            const emptyForMs = now - emptySince;
            const shouldRelease = emptyForMs > EMPTY_ROOM_TIMEOUT;

            if (!shouldRelease) {
                logger.debug(`Room ${room.id} is empty but within grace period`, {
                    roomId: room.id,
                    emptyForMinutes: Math.round(emptyForMs / (60 * 1000)),
                    gracePeriodMinutes: Math.round(EMPTY_ROOM_TIMEOUT / (60 * 1000)),
                });
                continue;
            }

            logger.debug(`Cleaning up empty room`, {
                roomId: room.id,
                reason: 'no connected clients',
                emptySince: new Date(emptySince).toISOString(),
                emptyForMinutes: Math.round(emptyForMs / (60 * 1000)),
            });

            await closeRoom(room.id, 'Room has been closed because it had no connected clients');
            cleanedRoomsCount++;
            recordRoomReleased();
        } catch (error) {
            logger.error(`Failed to process room ${key}`, { error });
        }
    }

    const { orphanedClientsCount } = await cleanupOrphanedClients();

    return { cleanedRoomsCount, orphanedClientsCount };
}

async function cleanupOrphanedClients() {
    const clientKeys = await scanRedisKeys('client:*');
    let orphanedClientsCount = 0;
    const now = Date.now();

    logger.debug(`Checking ${clientKeys.length} clients for orphaned entries`);

    for (const key of clientKeys) {
        const clientData = await connection.hgetall(key);

        if (!clientData.roomId) {
            if (
                clientData.lastSeen &&
                now - parseInt(clientData.lastSeen) > ORPHANED_CLIENT_TIMEOUT
            ) {
                await connection.del(key);
                orphanedClientsCount++;
            }
            continue;
        }

        const roomExists = await connection.exists(`room:${clientData.roomId}`);
        if (!roomExists) {
            await connection.del(key);
            orphanedClientsCount++;
        }
    }

    if (orphanedClientsCount > 0) {
        recordOrphanedClientsRemoved(orphanedClientsCount);
        logger.debug(`Cleaned up ${orphanedClientsCount} orphaned clients`);
    }

    return { orphanedClientsCount };
}

export async function scheduleCleanupJobs() {
    try {
        await cleanupQueue.add(
            'cleanup',
            {},
            {
                repeat: {
                    pattern: '*/10 * * * *', // Every 10 minutes
                },
            },
        );
        logger.info('Scheduled recurring cleanup jobs');
    } catch (error) {
        logger.error('Failed to schedule cleanup jobs', { error });
        throw error;
    }
}
