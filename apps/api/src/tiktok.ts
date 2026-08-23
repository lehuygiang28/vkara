import { Elysia, status } from 'elysia';
import { tiktokSearchBodySchema } from '@vkara/validators/tiktok/http';
import { closeSharedTikTokPool, getSharedTikTokPool } from '@vkara/tiktok/browser-pool';
import { toQueueVideo } from '@vkara/tiktok';

import { createContextLogger } from '@/utils/logger';
import { captureUnexpected } from '@/sentry';

const logger = createContextLogger('TikTok-Search');

export const searchTiktokElysia = new Elysia({ prefix: '/tiktok' }).post(
    '/search',
    async ({ body }) => {
        const keyword = body.query.trim();
        const pool = getSharedTikTokPool();

        try {
            const result = await pool.search({
                deviceId: body.deviceId,
                keyword,
                cursor: body.cursor,
                searchId: body.searchId,
            });
            const items = result.videos.map(toQueueVideo);
            const deviceIdShort =
                body.deviceId.length > 8 ? `${body.deviceId.slice(0, 8)}…` : body.deviceId;

            logger.info('TikTok search completed', {
                keyword,
                deviceId: deviceIdShort,
                count: items.length,
                cursor: result.cursor,
                hasMore: result.hasMore,
                searchId: result.searchId || undefined,
                elapsedMs: result.elapsedMs,
                warmupMs: pool.warmupMs,
                activeDeviceSessions: result.metrics.activeDeviceSessions,
                cachedTotal: result.metrics.cachedTotal,
                sessionReset: result.metrics.sessionReset,
                evictedLru: result.metrics.evictedLru,
                scrollBatches: result.metrics.scrollBatches,
                prunedTtl: result.metrics.prunedTtl,
            });

            return {
                items,
                cursor: result.hasMore ? String(result.cursor) : null,
                hasMore: result.hasMore,
                searchId: result.searchId || null,
            };
        } catch (error) {
            logger.error('TikTok search failed', {
                keyword,
                error: error instanceof Error ? error.message : String(error),
            });
            captureUnexpected(error, {
                tags: { area: 'tiktok', route: 'search', kind: 'upstream' },
                level: 'warning',
            });
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

/** Warm Playwright in the background so the first user search skips browser cold start. */
export function warmupTikTokPool(): void {
    void getSharedTikTokPool()
        .init()
        .catch((error) => {
            logger.warn('TikTok pool warmup failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
}
