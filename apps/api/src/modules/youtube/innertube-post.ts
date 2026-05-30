import type { Client } from 'youtubei';

import { createInFlightDedup } from './in-flight-dedup';

const innertubeInFlight = createInFlightDedup<string, { data: unknown }>();

const buildInnertubeKey = (endpoint: string, data: Record<string, unknown>): string =>
    `${endpoint}:${JSON.stringify(data)}`;

/** Dedupe identical in-flight InnerTube POSTs (same endpoint + body). */
export async function postInnertube(
    client: Client,
    endpoint: string,
    data: Record<string, unknown>,
): Promise<{ data: unknown }> {
    const key = buildInnertubeKey(endpoint, data);
    return innertubeInFlight.run(key, () => client.http.post(endpoint, { data }));
}
