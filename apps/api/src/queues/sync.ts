import { Redis } from 'ioredis';
import { Queue, Worker } from 'bullmq';

import { createContextLogger } from '@/utils/logger';
import { syncToMongoDB, syncFromMongoDB } from '@/mongodb-sync';

const logger = createContextLogger('Queue/Sync');

// Create a new Redis connection for BullMQ
const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
});

// Create the sync queues
export const syncRedisToDbQueue = new Queue('sync-redis-to-db', {
    connection,
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

export const syncDbToRedisQueue = new Queue('sync-db-to-redis', {
    connection,
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

// Create workers to process sync jobs
const redisToDbWorker = new Worker(
    'sync-redis-to-db',
    async () => {
        logger.info('Starting Redis to MongoDB sync');
        const success = await syncToMongoDB(connection);
        return { success };
    },
    {
        connection,
        concurrency: 1,
    },
);

const dbToRedisWorker = new Worker(
    'sync-db-to-redis',
    async () => {
        logger.info('Starting MongoDB to Redis sync');
        const success = await syncFromMongoDB(connection);
        return { success };
    },
    {
        connection,
        concurrency: 1,
    },
);

// Handle worker events
redisToDbWorker.on('completed', (job) => {
    logger.info(`Redis to MongoDB sync job ${job.id} has completed`, {
        jobId: job.id,
        result: job.returnvalue,
    });
});

redisToDbWorker.on('failed', (job, error) => {
    logger.error(`Redis to MongoDB sync job ${job?.id} has failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

dbToRedisWorker.on('completed', (job) => {
    logger.info(`MongoDB to Redis sync job ${job.id} has completed`, {
        jobId: job.id,
        result: job.returnvalue,
    });
});

dbToRedisWorker.on('failed', (job, error) => {
    logger.error(`MongoDB to Redis sync job ${job?.id} has failed`, {
        jobId: job?.id,
        error: error.message,
        stack: error.stack,
    });
});

// Schedule recurring sync jobs
export async function scheduleSyncJobs() {
    try {
        // Schedule Redis to MongoDB sync (every 10 minutes)
        await syncRedisToDbQueue.add(
            'sync-to-db',
            {},
            {
                repeat: {
                    pattern: '*/10 * * * *', // Every 10 minutes
                },
            },
        );

        // Schedule MongoDB to Redis sync (once every hour)
        // This is less frequent as it's mainly for recovery purposes
        await syncDbToRedisQueue.add(
            'sync-to-redis',
            {},
            {
                repeat: {
                    pattern: '0 * * * *', // Every hour at minute 0
                },
            },
        );

        logger.info('Scheduled recurring sync jobs');
        return true;
    } catch (error) {
        logger.error('Failed to schedule sync jobs', { error });
        throw error;
    }
}

// For backward compatibility
export const scheduleSyncRedisToDb = scheduleSyncJobs;
