import { Client } from 'youtubei';

let client: Client | null = null;

export function getYoutubeiClient(): Client {
    if (!client) {
        client = new Client({
            oauth: {
                enabled: false,
            },
        });
    }
    return client;
}
