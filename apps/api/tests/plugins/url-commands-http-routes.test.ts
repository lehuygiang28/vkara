import { describe, expect, it } from 'vitest';

import { urlCommandsElysia } from '@/plugins/url-commands.plugin';

const DESTRUCTIVE = [
    'lock',
    'unlock',
    'kick',
    'close',
    'clear',
    'claim',
    'promote',
    'demote',
];

describe('HTTP url-commands routes', () => {
    it('mounts session and playback only — no host-destructive verbs', () => {
        const routes = urlCommandsElysia.routes.map((route) => `${route.method} ${route.path}`);
        expect(routes).toEqual(
            expect.arrayContaining([
                'POST /url-commands/session',
                'GET /url-commands/session',
                'POST /url-commands/queue',
                'POST /url-commands/play',
                'POST /url-commands/next',
                'POST /url-commands/leave',
                'POST /url-commands/mint-join-token',
            ]),
        );
        for (const verb of DESTRUCTIVE) {
            expect(routes.some((route) => route.toLowerCase().includes(verb))).toBe(false);
        }
    });

    it('does not accept a client deviceId on the session schema', async () => {
        const response = await urlCommandsElysia.handle(
            new Request('http://localhost/url-commands/lock', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    bind: { roomId: '4821', displayName: 'Claude' },
                    deviceId: 'stolen-host',
                    clearQueue: '1',
                }),
            }),
        );
        expect(response.status).toBe(404);
    });
});
