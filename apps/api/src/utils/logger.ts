import chalk from 'chalk';
import winston from 'winston';
import * as Transport from 'winston-transport';

import { env } from '@/env';
import { parseEnvFlagValue } from '@vkara/env/base';

const LOG_TO_FILES = parseEnvFlagValue(env.LOG_TO_FILES, false);
const ERROR_LOG_PATH = env.ERROR_LOG_PATH;
const COMBINED_LOG_PATH = env.COMBINED_LOG_PATH;

// Custom log format
const customFormat = winston.format.printf(({ level, message, timestamp, context }) => {
    const colorizedLevel = (() => {
        switch (level) {
            case 'error':
                return chalk.red.bold(level);
            case 'warn':
                return chalk.yellow.bold(level);
            case 'info':
                return chalk.blue.bold(level);
            case 'debug':
                return chalk.gray.bold(level);
            default:
                return level;
        }
    })();

    const colorizedContext = context ? chalk.magenta(`[${context}]`) : '';
    return `${chalk.gray(timestamp)} ${colorizedLevel} ${colorizedContext}: ${message}`;
});

// Create the logger
const transports: Transport[] = [
    // Console transport for development
    new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.padLevels()),
    }),
];

if (LOG_TO_FILES) {
    if (ERROR_LOG_PATH) {
        transports.push(
            new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.json(),
            }),
        );
    }

    if (COMBINED_LOG_PATH) {
        transports.push(
            new winston.transports.File({
                filename: COMBINED_LOG_PATH,
                format: winston.format.json(),
            }),
        );
    }
}

const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        env.NODE_ENV === 'production' ? winston.format.json() : customFormat,
    ),
    defaultMeta: { service: 'video-room' },
    transports,
});

export const createContextLogger = (context: string) => {
    return {
        error: (message: string, meta: object = {}) => {
            logger.error(message, { context, ...meta });
        },
        warn: (message: string, meta: object = {}) => {
            logger.warn(message, { context, ...meta });
        },
        info: (message: string, meta: object = {}) => {
            logger.info(message, { context, ...meta });
        },
        debug: (message: string, meta: object = {}) => {
            logger.debug(message, { context, ...meta });
        },
    };
};

export const roomLogger = createContextLogger('Room');
export const wsLogger = createContextLogger('WebSocket');
export const cleanupLogger = createContextLogger('Cleanup');
export const redisLogger = createContextLogger('Redis');

export { logger };
export default logger;
