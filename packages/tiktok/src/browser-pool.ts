import type { Browser, BrowserContext, Page, Response } from 'playwright';

import { TikTokEmptyProbeError } from './errors';
import { parseVideos } from './parse-videos';
import { chromiumLaunchOptions } from './playwright-launch';
import { playwrightProxyFromEnv } from './playwright-proxy';
import { getSearchConfig } from './search-config';
import {
    loadMoreViaScroll,
    readSearchResponseBody,
    type CapturedSearchResponse,
} from './scroll-pagination';
import { DeviceSessionStore, type SearchSession } from './session-store';
import { isInitialSearchApiUrl, isUsableSearchResponse } from './search-response';
import type { SearchResponse, TikTokVideo } from './types';

function logProxyConfig(): void {
    const proxy = playwrightProxyFromEnv();
    if (!proxy) {
        console.info('[TikTokBrowserPool] No Playwright proxy configured');
        return;
    }

    console.info('[TikTokBrowserPool] Playwright proxy configured', {
        server: proxy.server,
        hasAuth: Boolean(proxy.username && proxy.password),
    });
}

const BROWSER_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0';

const SEARCH_RESPONSE_TIMEOUT_MS = 15_000;
const WARMUP_SETTLE_MS = 800;
const FETCH_RETRY_DELAY_MS = 700;
/** TikTok often returns an empty probe on first load; reload mimics the UI "Try again". */
const MAX_SEARCH_NAV_ATTEMPTS = 3;

export type TikTokSearchOptions = {
    deviceId: string;
    keyword: string;
    cursor?: number;
    searchId?: string;
};

export type PoolSearchMetrics = {
    activeDeviceSessions: number;
    cachedTotal: number;
    sessionReset?: boolean;
    evictedLru?: boolean;
    scrollBatches?: number;
    prunedTtl?: number;
};

export type PoolSearchResult = {
    videos: ReturnType<typeof parseVideos>;
    cursor: number;
    hasMore: boolean;
    searchId: string;
    elapsedMs: number;
    metrics: PoolSearchMetrics;
};

type PrefetchState = {
    videos: TikTokVideo[];
    signedUrl: string;
    tiktokNextCursor: number;
    tiktokHasMore: boolean;
};

function parseSearchResponse(json: SearchResponse) {
    return {
        videos: parseVideos(json.data ?? []),
        cursor: json.cursor ?? 0,
        hasMore: json.has_more === 1,
    };
}

/** Brief grace period after an empty probe before reloading the page. */
const SEARCH_PROBE_GRACE_MS = 400;

/** Waits for a non-empty TikTok search API response (skips bot-detection probe responses). */
function waitForNonemptySearchResponse(
    page: Page,
    keyword: string,
    timeoutMs = SEARCH_RESPONSE_TIMEOUT_MS,
): Promise<CapturedSearchResponse> {
    return new Promise((resolve, reject) => {
        let probeTimer: ReturnType<typeof setTimeout> | undefined;

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Search response timeout for "${keyword}"`));
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timer);
            if (probeTimer) clearTimeout(probeTimer);
            page.off('response', onResponse);
        };

        const onResponse = async (response: Response) => {
            const url = response.url();
            if (!isInitialSearchApiUrl(url, keyword)) {
                return;
            }

            const raw = await readSearchResponseBody(response);
            if (!raw.trim()) {
                if (!probeTimer) {
                    probeTimer = setTimeout(() => {
                        cleanup();
                        reject(new TikTokEmptyProbeError(keyword));
                    }, SEARCH_PROBE_GRACE_MS);
                }
                return;
            }

            let json: SearchResponse;
            try {
                json = JSON.parse(raw) as SearchResponse;
            } catch {
                return;
            }

            if (!isUsableSearchResponse(json)) {
                return;
            }

            cleanup();
            resolve({ json, signedUrl: url });
        };

        page.on('response', onResponse);
    });
}

async function ensureSearchPage(page: Page, keyword: string): Promise<void> {
    const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
    const currentUrl = page.url();
    if (currentUrl.includes('/search') && currentUrl.includes(encodeURIComponent(keyword))) {
        return;
    }

    await page
        .goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        })
        .catch(() => undefined);
    await page.waitForTimeout(WARMUP_SETTLE_MS);
}

async function prefetchSearchVideos(page: Page, keyword: string): Promise<PrefetchState> {
    const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_SEARCH_NAV_ATTEMPTS; attempt++) {
        const responsePromise = waitForNonemptySearchResponse(page, keyword);

        if (attempt === 1) {
            await page
                .goto(searchUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30_000,
                })
                .catch(() => undefined);
        } else {
            await page
                .reload({
                    waitUntil: 'domcontentloaded',
                    timeout: 30_000,
                })
                .catch(() => undefined);
        }

        try {
            const { json, signedUrl } = await responsePromise;
            const parsed = parseSearchResponse(json);
            return {
                videos: parsed.videos,
                signedUrl,
                tiktokNextCursor: parsed.cursor,
                tiktokHasMore: parsed.hasMore,
            };
        } catch (error) {
            lastError = error;
            if (error instanceof TikTokEmptyProbeError && attempt < MAX_SEARCH_NAV_ATTEMPTS) {
                continue;
            }
            if (attempt < MAX_SEARCH_NAV_ATTEMPTS) {
                await page.waitForTimeout(FETCH_RETRY_DELAY_MS);
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error(`TikTok search failed for "${keyword}"`);
}

function sliceClientPage(
    session: SearchSession,
    offset: number,
    pageSize: number,
): Pick<PoolSearchResult, 'videos' | 'cursor' | 'hasMore' | 'searchId'> {
    const videos = session.cachedVideos.slice(offset, offset + pageSize);
    const nextOffset = offset + videos.length;
    const hasCachedMore = nextOffset < session.cachedVideos.length;
    const hasMore = hasCachedMore || session.tiktokHasMore;

    return {
        videos,
        cursor: nextOffset,
        hasMore,
        searchId: session.searchId,
    };
}

export class TikTokBrowserPool {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private queue: Promise<unknown> = Promise.resolve();
    private initMs = 0;
    private readonly config = getSearchConfig();
    private readonly sessionStore = new DeviceSessionStore(this.config);

    get warmupMs(): number {
        return this.initMs;
    }

    async init(): Promise<void> {
        if (this.browser) return;

        const start = performance.now();
        const { chromium } = await import('playwright');
        const launchOptions = chromiumLaunchOptions();

        logProxyConfig();
        if (!launchOptions.headless) {
            console.info('[TikTokBrowserPool] Running headed Chromium (PLAYWRIGHT_HEADED)');
        }

        this.browser = await chromium.launch(launchOptions);
        const proxy = playwrightProxyFromEnv();
        this.context = await this.browser.newContext({
            ...(proxy ? { proxy } : {}),
            userAgent: BROWSER_UA,
            locale: 'en-US',
            viewport: { width: 1280, height: 800 },
        });

        await this.context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        this.page = await this.context.newPage();

        await this.page.goto('https://www.tiktok.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 20_000,
        });
        await this.page.waitForTimeout(WARMUP_SETTLE_MS);

        this.sessionStore.startPeriodicPrune((prunedCount) => {
            console.info('[TikTokBrowserPool] Pruned expired device sessions', {
                prunedCount,
                activeDeviceSessions: this.sessionStore.size,
            });
        });

        this.initMs = Math.round(performance.now() - start);
    }

    async search(options: TikTokSearchOptions): Promise<PoolSearchResult> {
        return this.enqueue(async () => {
            await this.init();

            const keyword = options.keyword.trim();
            const deviceId = options.deviceId.trim();
            const offset = options.cursor ?? 0;
            const start = performance.now();
            const prunedTtl = this.sessionStore.pruneExpired();

            if (!deviceId) {
                throw new Error('deviceId is required');
            }

            if (offset <= 0) {
                const { session, sessionReset, evictedLru } = this.sessionStore.resetSession(
                    deviceId,
                    keyword,
                );
                const prefetch = await prefetchSearchVideos(this.page!, keyword);

                session.baseSignedUrl = prefetch.signedUrl;
                session.cachedVideos = prefetch.videos;
                session.tiktokNextCursor = prefetch.tiktokNextCursor;
                session.tiktokHasMore = prefetch.tiktokHasMore;
                session.updatedAt = Date.now();

                const pageResult = sliceClientPage(session, 0, this.config.pageSize);
                const metrics = this.sessionStore.snapshot();

                if (metrics.activeDeviceSessions >= this.config.maxDeviceSessions * 0.8) {
                    console.warn('[TikTokBrowserPool] Device session count nearing cap', metrics);
                }

                return {
                    ...pageResult,
                    elapsedMs: Math.round(performance.now() - start),
                    metrics: {
                        ...metrics,
                        sessionReset,
                        evictedLru,
                        prunedTtl: prunedTtl > 0 ? prunedTtl : undefined,
                    },
                };
            }

            if (!options.searchId) {
                throw new Error('searchId is required when cursor > 0');
            }

            const session = this.sessionStore.getSessionForLoadMore(
                deviceId,
                options.searchId,
                keyword,
            );
            if (!session) {
                throw new Error('Search session expired or invalid');
            }

            const targetLength = offset + this.config.pageSize;
            let scrollBatches = 0;
            while (session.cachedVideos.length < targetLength && session.tiktokHasMore) {
                const beforeCount = session.cachedVideos.length;
                await this.appendFromTikTok(session);
                scrollBatches += 1;
                if (session.cachedVideos.length === beforeCount) {
                    break;
                }
            }

            const pageResult = sliceClientPage(session, offset, this.config.pageSize);
            const metrics = this.sessionStore.snapshot();

            return {
                ...pageResult,
                elapsedMs: Math.round(performance.now() - start),
                metrics: {
                    ...metrics,
                    scrollBatches: scrollBatches > 0 ? scrollBatches : undefined,
                    prunedTtl: prunedTtl > 0 ? prunedTtl : undefined,
                },
            };
        });
    }

    private async appendFromTikTok(session: SearchSession): Promise<void> {
        const page = this.page!;
        await ensureSearchPage(page, session.keyword);

        const beforeCount = session.cachedVideos.length;
        const captured = await loadMoreViaScroll(page, session.keyword, session.tiktokNextCursor);
        if (!captured) {
            session.tiktokHasMore = false;
            return;
        }

        const parsed = parseSearchResponse(captured.json);
        if (parsed.videos.length === 0) {
            session.tiktokHasMore = false;
            return;
        }

        const existingIds = new Set(session.cachedVideos.map((video) => video.id));
        const fresh = parsed.videos.filter((video) => !existingIds.has(video.id));
        session.cachedVideos.push(...fresh);
        session.baseSignedUrl = captured.signedUrl;
        session.tiktokNextCursor = parsed.cursor;
        session.tiktokHasMore = parsed.hasMore;
        session.updatedAt = Date.now();

        if (session.cachedVideos.length === beforeCount) {
            session.tiktokHasMore = false;
        }
    }

    async close(): Promise<void> {
        this.sessionStore.stopPeriodicPrune();
        await this.page?.close().catch(() => {});
        await this.context?.close().catch(() => {});
        await this.browser?.close().catch(() => {});
        this.page = null;
        this.context = null;
        this.browser = null;
        this.sessionStore.clear();
    }

    private enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.queue.then(fn, fn);
        this.queue = run.then(
            () => undefined,
            () => undefined,
        );
        return run;
    }
}

let sharedPool: TikTokBrowserPool | null = null;

export function getSharedTikTokPool(): TikTokBrowserPool {
    if (!sharedPool) sharedPool = new TikTokBrowserPool();
    return sharedPool;
}

export async function closeSharedTikTokPool(): Promise<void> {
    if (sharedPool) {
        await sharedPool.close();
        sharedPool = null;
    }
}
