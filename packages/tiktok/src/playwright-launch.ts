const CHROMIUM_ARGS = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
] as const;

function parseHeadedFlag(raw: string | undefined): boolean {
    if (!raw) return false;
    return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/** Headed Chromium can help on strict bot checks; headless + reload works for most cases. */
export function playwrightHeadedFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
    return parseHeadedFlag(env.PLAYWRIGHT_HEADED);
}

export function chromiumLaunchOptions(env: NodeJS.ProcessEnv = process.env): {
    headless: boolean;
    args: string[];
    executablePath?: string;
} {
    const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
    const headed = playwrightHeadedFromEnv(env);

    return {
        headless: !headed,
        args: [
            ...CHROMIUM_ARGS,
            ...(executablePath ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
        ],
        ...(executablePath ? { executablePath } : {}),
    };
}
