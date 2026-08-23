import type { Browser, BrowserContext, Page, Response } from 'playwright';

import { TikTokEmptyProbeError } from './errors';
import { parseVideos } from './parse-videos';
import { chromiumLaunchOptions } from './playwright-launch';
import { playwrightProxyFromEnv } from './playwright-proxy';
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
const SESSION_TTL_MS = 5 * 60 * 1000;
/** Items returned to the client per search page. */
const CLIENT_PAGE_SIZE = 12;
/** Videos fetched from TikTok in one signed request (served in chunks). */
const PREFETCH_COUNT = 60;

export type TikTokSearchOptions = {
    keyword: string;
    cursor?: number;
    searchId?: string;
};

export type PoolSearchResult = {
    videos: ReturnType<typeof parseVideos>;
    cursor: number;
    hasMore: boolean;
    searchId: string;
    elapsedMs: number;
};

type SearchSession = {
    keyword: string;
    searchId: string;
    baseSignedUrl: string;
    cachedVideos: TikTokVideo[];
    tiktokNextCursor: number;
    tiktokHasMore: boolean;
    updatedAt: number;
};

function parseSearchResponse(json: SearchResponse) {
    return {
        videos: parseVideos(json.data ?? []),
        cursor: json.cursor ?? 0,
        hasMore: json.has_more === 1,
    };
}

type CapturedSearchResponse = {
    json: SearchResponse;
    signedUrl: string;
};

function parseCapturedSearchResponse(raw: string): SearchResponse {
    const json = JSON.parse(raw) as SearchResponse;

    // TikTok returns 203 for large `count` on popular keywords (e.g. "karaoke …")
    // while still including a usable batch — do not treat that as a hard failure.
    const hasItems = (json.data?.length ?? 0) > 0;
    if (json.status_code !== 0 && !(json.status_code === 203 && hasItems)) {
        throw new Error(
            `TikTok error (status_code=${json.status_code}): ${json.message ?? 'unknown'}`,
        );
    }

    return json;
}

async function readSearchResponseBody(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        return '';
    }
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

async function fetchSearchJson(page: Page, signedUrl: string): Promise<SearchResponse> {
    const targetCursor = Number(new URL(signedUrl).searchParams.get('cursor') ?? '0');
    const keyword = new URL(signedUrl).searchParams.get('keyword') ?? '';

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        const responsePromise = page.waitForResponse(
            (response) => {
                const url = response.url();
                if (!url.includes('/api/search/general/full')) {
                    return false;
                }
                if (keyword && new URL(url).searchParams.get('keyword') !== keyword) {
                    return false;
                }
                return Number(new URL(url).searchParams.get('cursor') ?? '0') === targetCursor;
            },
            { timeout: SEARCH_RESPONSE_TIMEOUT_MS },
        );

        void page.evaluate(async (url) => {
            await fetch(url);
        }, signedUrl);

        try {
            const response = await responsePromise;
            const raw = await readSearchResponseBody(response);
            if (!raw.trim()) {
                throw new Error('Empty search response from in-page fetch.');
            }
            return parseCapturedSearchResponse(raw);
        } catch (error) {
            lastError = error;
            if (attempt === 0) {
                await page.waitForTimeout(FETCH_RETRY_DELAY_MS);
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Empty search response from in-page fetch.');
}

function createPoolSearchSessionId(): string {
    return `tt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function prefetchSearchVideos(
    page: Page,
    keyword: string,
): Promise<{
    videos: TikTokVideo[];
    signedUrl: string;
    tiktokNextCursor: number;
    tiktokHasMore: boolean;
}> {
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
                // TikTok often returns non-2xx on the search document while still issuing signed API requests.
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

function sliceClientPage(session: SearchSession, offset: number): PoolSearchResult {
    const videos = session.cachedVideos.slice(offset, offset + CLIENT_PAGE_SIZE);
    const nextOffset = offset + videos.length;
    const hasCachedMore = nextOffset < session.cachedVideos.length;
    const hasMore = hasCachedMore || session.tiktokHasMore;

    return {
        videos,
        cursor: nextOffset,
        hasMore,
        searchId: session.searchId,
        elapsedMs: 0,
    };
}

export class TikTokBrowserPool {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private queue: Promise<unknown> = Promise.resolve();
    private initMs = 0;
    private sessions = new Map<string, SearchSession>();

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

        this.initMs = Math.round(performance.now() - start);
    }

    async search(keywordOrOptions: string | TikTokSearchOptions): Promise<PoolSearchResult> {
        const options: TikTokSearchOptions =
            typeof keywordOrOptions === 'string' ? { keyword: keywordOrOptions } : keywordOrOptions;

        return this.enqueue(async () => {
            await this.init();
            this.pruneSessions();

            const keyword = options.keyword.trim();
            const offset = options.cursor ?? 0;
            const start = performance.now();

            if (offset <= 0) {
                const prefetch = await prefetchSearchVideos(this.page!, keyword);
                const searchId = createPoolSearchSessionId();
                const session: SearchSession = {
                    keyword,
                    searchId,
                    baseSignedUrl: prefetch.signedUrl,
                    cachedVideos: prefetch.videos,
                    tiktokNextCursor: prefetch.tiktokNextCursor,
                    tiktokHasMore: prefetch.tiktokHasMore,
                    updatedAt: Date.now(),
                };
                this.sessions.set(searchId, session);

                const pageResult = sliceClientPage(session, 0);
                return {
                    ...pageResult,
                    elapsedMs: Math.round(performance.now() - start),
                };
            }

            if (!options.searchId) {
                throw new Error('searchId is required when cursor > 0');
            }

            const session = this.sessions.get(options.searchId);
            if (!session || session.keyword !== keyword) {
                throw new Error('Search session expired or invalid');
            }

            session.updatedAt = Date.now();

            if (offset >= session.cachedVideos.length && session.tiktokHasMore) {
                await this.appendFromTikTok(session, offset);
            }

            const pageResult = sliceClientPage(session, offset);
            return {
                ...pageResult,
                elapsedMs: Math.round(performance.now() - start),
            };
        });
    }

    private async appendFromTikTok(session: SearchSession, offset: number): Promise<void> {
        const url = new URL(session.baseSignedUrl);
        url.searchParams.set('count', String(PREFETCH_COUNT));
        url.searchParams.set('cursor', String(session.tiktokNextCursor));
        url.searchParams.set('offset', String(session.tiktokNextCursor));

        try {
            const json = await fetchSearchJson(this.page!, url.toString());
            const parsed = parseSearchResponse(json);
            if (parsed.videos.length === 0) {
                session.tiktokHasMore = false;
                return;
            }

            const existingIds = new Set(session.cachedVideos.map((video) => video.id));
            const fresh = parsed.videos.filter((video) => !existingIds.has(video.id));
            session.cachedVideos.push(...fresh);
            session.tiktokNextCursor = parsed.cursor;
            session.tiktokHasMore = parsed.hasMore;

            if (offset >= session.cachedVideos.length && session.tiktokHasMore) {
                session.tiktokHasMore = false;
            }
        } catch {
            session.tiktokHasMore = false;
        }
    }

    async close(): Promise<void> {
        await this.page?.close().catch(() => {});
        await this.context?.close().catch(() => {});
        await this.browser?.close().catch(() => {});
        this.page = null;
        this.context = null;
        this.browser = null;
        this.sessions.clear();
    }

    private pruneSessions(): void {
        const now = Date.now();
        for (const [id, session] of this.sessions) {
            if (now - session.updatedAt > SESSION_TTL_MS) {
                this.sessions.delete(id);
            }
        }
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
