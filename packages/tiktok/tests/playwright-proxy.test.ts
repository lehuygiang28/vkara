import { describe, expect, it } from 'vitest';

import { playwrightProxyFromEnv } from '../src/playwright-proxy';

describe('playwrightProxyFromEnv', () => {
    it('returns undefined when PLAYWRIGHT_PROXY_SERVER is unset', () => {
        expect(playwrightProxyFromEnv({})).toBeUndefined();
    });

    it('returns server only when credentials are missing', () => {
        expect(
            playwrightProxyFromEnv({
                PLAYWRIGHT_PROXY_SERVER: 'http://127.0.0.1:1080',
            }),
        ).toEqual({ server: 'http://127.0.0.1:1080' });
    });

    it('includes username and password when both are set', () => {
        expect(
            playwrightProxyFromEnv({
                PLAYWRIGHT_PROXY_SERVER: 'http://127.0.0.1:1080',
                PLAYWRIGHT_PROXY_USERNAME: 'vkara',
                PLAYWRIGHT_PROXY_PASSWORD: 'secret',
            }),
        ).toEqual({
            server: 'http://127.0.0.1:1080',
            username: 'vkara',
            password: 'secret',
        });
    });

    it('trims whitespace', () => {
        expect(
            playwrightProxyFromEnv({
                PLAYWRIGHT_PROXY_SERVER: '  http://127.0.0.1:1080  ',
                PLAYWRIGHT_PROXY_USERNAME: ' vkara ',
                PLAYWRIGHT_PROXY_PASSWORD: ' secret ',
            }),
        ).toEqual({
            server: 'http://127.0.0.1:1080',
            username: 'vkara',
            password: 'secret',
        });
    });
});
