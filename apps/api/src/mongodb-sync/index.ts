import { Redis } from 'ioredis';
import mongoose from 'mongoose';

import type { Room, ClientInfo } from '@/types';
import { createContextLogger } from '@/utils/logger';

import { RoomModel } from './room.schema';
import { ClientModel } from './client.schema';

const logger = createContextLogger('MongoDB');
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Synchronizes data from Redis to MongoDB with retry capability
 * @param redis Redis client instance
 * @returns Promise<boolean> indicating success or failure
 */
export async function syncToMongoDB(redis: Redis): Promise<boolean> {
    if (!process.env.MONGODB_URI) {
        logger.warn('MongoDB URI not provided, skipping sync');
        return false;
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            logger.info('Reconnected to MongoDB before sync');
        } catch (error) {
            logger.error('Failed to connect to MongoDB', { error });
            return false;
        }
    }

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
        if (retries > 0) {
            logger.info(`Retry attempt ${retries}/${MAX_RETRIES}`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get all keys
            const roomKeys = await redis.keys('room:*');
            const clientKeys = await redis.keys('client:*');

            logger.info(`Found ${roomKeys.length} rooms and ${clientKeys.length} clients to sync`);

            // Skip sync if no data to sync
            if (roomKeys.length === 0 && clientKeys.length === 0) {
                logger.info('No data to sync to MongoDB');
                await session.endSession();
                return true;
            }

            // Process rooms in batches
            for (let i = 0; i < roomKeys.length; i += BATCH_SIZE) {
                const batch = roomKeys.slice(i, i + BATCH_SIZE);
                const roomDocs: Room[] = [];

                for (const key of batch) {
                    const roomId = key.replace('room:', '');
                    const roomData = await redis.get(key);

                    if (!roomData) continue;

                    try {
                        const room: Room = JSON.parse(roomData);
                        roomDocs.push(room);
                    } catch (error) {
                        logger.warn(`Failed to parse room data for ${roomId}`, { error });
                    }
                }

                if (roomDocs.length > 0) {
                    // Use updateMany with upsert to avoid duplicates
                    const bulkOps = roomDocs.map((room) => ({
                        updateOne: {
                            filter: { id: room.id },
                            update: { $set: room },
                            upsert: true,
                        },
                    }));

                    await RoomModel.bulkWrite(bulkOps, { session });
                    logger.debug(`Synced batch of ${roomDocs.length} rooms`);
                }
            }

            // Process clients in batches
            for (let i = 0; i < clientKeys.length; i += BATCH_SIZE) {
                const batch = clientKeys.slice(i, i + BATCH_SIZE);
                const clientDocs: ClientInfo[] = [];

                for (const key of batch) {
                    const clientId = key.replace('client:', '');
                    const clientData = await redis.hgetall(key);

                    if (clientData && clientData.roomId) {
                        const clientInfo: ClientInfo = {
                            id: clientId,
                            roomId: clientData.roomId,
                            lastSeen: Date.now(),
                        };
                        clientDocs.push(clientInfo);
                    }
                }

                if (clientDocs.length > 0) {
                    const bulkOps = clientDocs.map((client) => ({
                        updateOne: {
                            filter: { id: client.id },
                            update: { $set: client },
                            upsert: true,
                        },
                    }));

                    await ClientModel.bulkWrite(bulkOps, { session });
                    logger.debug(`Synced batch of ${clientDocs.length} clients`);
                }
            }

            await session.commitTransaction();
            session.endSession();

            logger.info('Successfully synced data to MongoDB');
            success = true;
            return true;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();

            logger.error(`Sync attempt ${retries + 1} failed`, { error });
            retries++;

            if (retries >= MAX_RETRIES) {
                logger.error('All sync attempts failed');
                return false;
            }
        }
    }

    return success;
}

/**
 * Synchronizes data from MongoDB to Redis with retry capability and cursor-based processing
 * @param redis Redis client instance
 * @returns Promise<boolean> indicating success or failure
 */
export async function syncFromMongoDB(redis: Redis): Promise<boolean> {
    if (!process.env.MONGODB_URI) {
        logger.warn('MongoDB URI not provided, skipping sync');
        return false;
    }

    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            logger.info('Reconnected to MongoDB before sync');
        } catch (error) {
            logger.error('Failed to connect to MongoDB', { error });
            return false;
        }
    }

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
        if (retries > 0) {
            logger.info(`Retry attempt ${retries}/${MAX_RETRIES}`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }

        try {
            // Check if there's data to sync
            const roomCount = await RoomModel.countDocuments();
            const clientCount = await ClientModel.countDocuments();

            if (roomCount === 0 && clientCount === 0) {
                logger.info('No data to sync from MongoDB');
                return true;
            }

            logger.info(`Found ${roomCount} rooms and ${clientCount} clients in MongoDB to sync`);

            // Sync rooms from MongoDB to Redis in batches using cursor
            const roomCursor = RoomModel.find().cursor();
            let roomsSynced = 0;
            let roomErrors = 0;

            for (let room = await roomCursor.next(); room != null; room = await roomCursor.next()) {
                try {
                    const roomObject = room.toObject();
                    await redis.set(`room:${room.id}`, JSON.stringify(roomObject));
                    roomsSynced++;
                } catch (error) {
                    roomErrors++;
                    logger.warn(`Failed to sync room ${room.id} to Redis`, { error });
                }

                // Log progress periodically
                if (roomsSynced % BATCH_SIZE === 0) {
                    logger.debug(`Synced ${roomsSynced} rooms so far`);
                }
            }

            // Sync clients from MongoDB to Redis in batches using cursor
            const clientCursor = ClientModel.find().cursor();
            let clientsSynced = 0;
            let clientErrors = 0;

            for (
                let client = await clientCursor.next();
                client != null;
                client = await clientCursor.next()
            ) {
                if (!client.roomId) continue;

                try {
                    const clientObj = {
                        roomId: client.roomId,
                        lastSeen: client.lastSeen || Date.now(),
                    };
                    await redis.hset(`client:${client.id}`, clientObj);
                    clientsSynced++;
                } catch (error) {
                    clientErrors++;
                    logger.warn(`Failed to sync client ${client.id} to Redis`, { error });
                }

                // Log progress periodically
                if (clientsSynced % BATCH_SIZE === 0) {
                    logger.debug(`Synced ${clientsSynced} clients so far`);
                }
            }

            logger.info(
                `Successfully synced ${roomsSynced}/${roomCount} rooms (${roomErrors} errors) and ${clientsSynced}/${clientCount} clients (${clientErrors} errors) from MongoDB to Redis`,
            );
            success = true;
            return true;
        } catch (error) {
            logger.error(`Sync attempt ${retries + 1} failed`, { error });
            retries++;

            if (retries >= MAX_RETRIES) {
                logger.error('All sync attempts failed');
                return false;
            }
        }
    }

    return success;
}

/**
 * Ensures data integrity between Redis and MongoDB
 * This function can be used periodically to fix any inconsistencies
 * @param redis Redis client instance
 */
export async function validateDataIntegrity(redis: Redis): Promise<void> {
    if (!process.env.MONGODB_URI) return;

    try {
        logger.info('Starting data integrity validation...');

        // 1. Find orphaned clients (clients without rooms)
        const clientKeys = await redis.keys('client:*');
        let orphanedClientsCount = 0;

        for (const key of clientKeys) {
            const clientData = await redis.hgetall(key);
            if (clientData.roomId) {
                const roomExists = await redis.exists(`room:${clientData.roomId}`);
                if (!roomExists) {
                    // Client has reference to non-existent room
                    await redis.del(key);
                    orphanedClientsCount++;
                }
            }
        }

        // 2. Find rooms with non-existent clients
        const roomKeys = await redis.keys('room:*');
        let invalidRoomClientsCount = 0;

        for (const key of roomKeys) {
            const roomData = await redis.get(key);
            if (roomData) {
                try {
                    const room: Room = JSON.parse(roomData);
                    const validClients = [];

                    for (const clientId of room.clients) {
                        const clientExists = await redis.exists(`client:${clientId}`);
                        if (clientExists) {
                            validClients.push(clientId);
                        }
                    }

                    if (validClients.length !== room.clients.length) {
                        invalidRoomClientsCount++;
                        room.clients = validClients;
                        await redis.set(key, JSON.stringify(room));
                    }
                } catch (error) {
                    logger.warn(`Failed to validate room ${key}`, { error });
                }
            }
        }

        logger.info(
            `Data integrity validation complete. Fixed ${orphanedClientsCount} orphaned clients and ${invalidRoomClientsCount} rooms with invalid clients.`,
        );
    } catch (error) {
        logger.error('Failed to validate data integrity', { error });
    }
}
