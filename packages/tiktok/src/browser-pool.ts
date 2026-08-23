import type { Browser, BrowserContext, Page } from 'playwright';

import { parseVideos } from './parse-videos';
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

const CHROMIUM_ARGS = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
] as const;

function chromiumLaunchOptions(): {
    headless: true;
    args: string[];
    executablePath?: string;
} {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
    return {
        headless: true,
        args: [
            ...CHROMIUM_ARGS,
            ...(executablePath ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        ],
        ...(executablePath ? { executablePath } : {}),
    };
}

const SEARCH_RESPONSE_TIMEOUT_MS = 15_000;
const WARMUP_SETTLE_MS = 800;
const FETCH_RETRY_DELAY_MS = 700;
/** TikTok often returns an empty probe on first load; reload mimics the UI "Try again". */
const MAX_SEARCH_NAV_ATTEMPTS = 3;
const SEARCH_PROBE_RETRY_MS = 1_500;
const SEARCH_RETRY_SETTLE_MS = 800;
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

/** Waits for a non-empty TikTok search API response (skips bot-detection probe responses). */
function waitForNonemptySearchResponse(
    page: Page,
    keyword: string,
    timeoutMs = SEARCH_RESPONSE_TIMEOUT_MS,
): Promise<CapturedSearchResponse> {
    return new Promise((resolve, reject) => {
        let sawEmptyProbe = false;
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

        const onResponse = async (response: { url: () => string; text: () => Promise<string> }) => {
            const url = response.url();
            if (!isInitialSearchApiUrl(url, keyword)) {
                return;
            }

            let raw = '';
            try {
                raw = await response.text();
            } catch {
                return;
            }

            if (!raw.trim()) {
                if (!sawEmptyProbe) {
                    sawEmptyProbe = true;
                    probeTimer = setTimeout(() => {
                        cleanup();
                        reject(new Error(`Empty probe response for "${keyword}"`));
                    }, SEARCH_PROBE_RETRY_MS);
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
    const readBody = () =>
        page.evaluate(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.text();
        }, signedUrl);

    let raw = '';
    for (let attempt = 0; attempt < 4; attempt++) {
        raw = await readBody();
        if (raw.trim()) {
            break;
        }
        await page.waitForTimeout(FETCH_RETRY_DELAY_MS);
    }

    if (!raw.trim()) {
        throw new Error('Empty search response from in-page fetch.');
    }

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
            if (attempt < MAX_SEARCH_NAV_ATTEMPTS) {
                await page.waitForTimeout(SEARCH_RETRY_SETTLE_MS);
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

        logProxyConfig();

        this.browser = await chromium.launch(chromiumLaunchOptions());
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
