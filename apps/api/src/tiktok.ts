import { Elysia, status } from 'elysia';
import { tiktokSearchBodySchema } from '@vkara/validators/tiktok/http';
import { closeSharedTikTokPool, getSharedTikTokPool } from '@vkara/tiktok/browser-pool';
import { toQueueVideo } from '@vkara/tiktok';

import { createContextLogger } from '@/utils/logger';

const logger = createContextLogger('TikTok-Search');

export const searchTiktokElysia = new Elysia({ prefix: '/tiktok' }).post(
    '/search',
    async ({ body }) => {
        const keyword = body.query.trim();
        const pool = getSharedTikTokPool();

        try {
            const result = await pool.search({
                keyword,
                cursor: body.cursor,
                searchId: body.searchId,
            });
            const items = result.videos.map(toQueueVideo);

            logger.info('TikTok search completed', {
                keyword,
                count: items.length,
                cursor: result.cursor,
                hasMore: result.hasMore,
                searchId: result.searchId || undefined,
                elapsedMs: result.elapsedMs,
                warmupMs: pool.warmupMs,
            });

            return {
                items,
                cursor: result.hasMore ? String(result.cursor) : null,
                hasMore: result.hasMore,
                searchId: result.searchId || null,
            };
        } catch (error) {
            logger.error('TikTok search failed', { keyword, error });
            return status(502, {
                error: error instanceof Error ? error.message : 'TikTok search failed',
            });
        }
    },
    {
        body: tiktokSearchBodySchema,
    },
);

export async function shutdownTikTokPool(): Promise<void> {
    await closeSharedTikTokPool();
}
