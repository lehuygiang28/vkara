import { Client } from 'youtubei';

import { ensureYoutubeiNativeFetch } from './youtubei-native-fetch';

let client: Client | null = null;

export function getYoutubeiClient(): Client {
    if (!client) {
        client = new Client({
            oauth: {
                enabled: false,
            },
        });
        ensureYoutubeiNativeFetch(client);
    }
    return client;
}
