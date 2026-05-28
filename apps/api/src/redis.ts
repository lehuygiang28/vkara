import Redis from 'ioredis';
import { createRedisOptions } from '@vkara/shared-infra';

export const redis = new Redis(createRedisOptions(process.env));
