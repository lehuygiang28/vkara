import { describe, expect, it } from 'vitest';

import { chromiumLaunchOptions, playwrightHeadedFromEnv } from '../src/playwright-launch';

describe('playwrightHeadedFromEnv', () => {
    it('defaults to headless', () => {
        expect(playwrightHeadedFromEnv({})).toBe(false);
    });

    it('enables headed mode from PLAYWRIGHT_HEADED', () => {
        expect(playwrightHeadedFromEnv({ PLAYWRIGHT_HEADED: '1' })).toBe(true);
        expect(playwrightHeadedFromEnv({ PLAYWRIGHT_HEADED: 'true' })).toBe(true);
    });
});

describe('chromiumLaunchOptions', () => {
    it('maps headed flag to launch headless option', () => {
        expect(chromiumLaunchOptions({}).headless).toBe(true);
        expect(chromiumLaunchOptions({ PLAYWRIGHT_HEADED: '1' }).headless).toBe(false);
    });

    it('passes executable path for container Chromium', () => {
        expect(
            chromiumLaunchOptions({
                PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/usr/bin/chromium-browser',
            }),
        ).toMatchObject({
            executablePath: '/usr/bin/chromium-browser',
            args: expect.arrayContaining(['--no-sandbox']),
        });
    });
});
