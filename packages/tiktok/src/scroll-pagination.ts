import type { Page, Response } from 'playwright';

import { TikTokEmptyProbeError } from './errors';
import { isUsableSearchResponse } from './search-response';
import type { SearchResponse } from './types';

export const SCROLL_LOAD_TIMEOUT_MS = 20_000;
const SCROLL_STEP_DELAY_MS = 250;

export type CapturedSearchResponse = {
    json: SearchResponse;
    signedUrl: string;
};

export async function readSearchResponseBody(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        return '';
    }
}

export function parseCapturedSearchResponse(raw: string): SearchResponse {
    const json = JSON.parse(raw) as SearchResponse;

    const hasItems = (json.data?.length ?? 0) > 0;
    if (json.status_code !== 0 && !(json.status_code === 203 && hasItems)) {
        throw new Error(
            `TikTok error (status_code=${json.status_code}): ${json.message ?? 'unknown'}`,
        );
    }

    return json;
}

export function matchesSearchKeyword(url: string, keyword: string): boolean {
    if (!url.includes('/api/search/general/full')) {
        return false;
    }

    return new URL(url).searchParams.get('keyword') === keyword;
}

/** Waits for a scroll-triggered search API response at or after `minCursor`. */
export function waitForSearchScrollResponse(
    page: Page,
    keyword: string,
    minCursor: number,
    timeoutMs = SCROLL_LOAD_TIMEOUT_MS,
): Promise<CapturedSearchResponse> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Scroll pagination timeout for "${keyword}"`));
        }, timeoutMs);

        const cleanup = () => {
            clearTimeout(timer);
            page.off('response', onResponse);
        };

        const onResponse = async (response: Response) => {
            const url = response.url();
            if (!matchesSearchKeyword(url, keyword)) {
                return;
            }

            const cursor = Number(new URL(url).searchParams.get('cursor') ?? '0');
            if (cursor < minCursor) {
                return;
            }

            const raw = await readSearchResponseBody(response);
            if (!raw.trim()) {
                cleanup();
                reject(new TikTokEmptyProbeError(keyword));
                return;
            }

            let json: SearchResponse;
            try {
                json = parseCapturedSearchResponse(raw);
            } catch (error) {
                cleanup();
                reject(error instanceof Error ? error : new Error(String(error)));
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

/** Scrolls result cards so TikTok issues the next signed search request. */
export async function triggerSearchScrollLoad(page: Page): Promise<void> {
    const cards = page.locator('a[href*="/video/"]');
    const count = await cards.count();
    if (count === 0) {
        await page.mouse.wheel(0, 1_200);
        await page.waitForTimeout(SCROLL_STEP_DELAY_MS);
        return;
    }

    const start = Math.max(0, count - 4);
    for (let index = start; index < count; index++) {
        await cards.nth(index).scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(SCROLL_STEP_DELAY_MS);
    }

    await cards
        .nth(count - 1)
        .scrollIntoViewIfNeeded()
        .catch(() => undefined);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(SCROLL_STEP_DELAY_MS);
}

export async function loadMoreViaScroll(
    page: Page,
    keyword: string,
    minCursor: number,
): Promise<CapturedSearchResponse | null> {
    const responsePromise = waitForSearchScrollResponse(page, keyword, minCursor);
    await triggerSearchScrollLoad(page);

    try {
        return await responsePromise;
    } catch {
        return null;
    }
}
