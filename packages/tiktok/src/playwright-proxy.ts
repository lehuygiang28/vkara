export type PlaywrightProxyConfig = {
    server: string;
    username?: string;
    password?: string;
};

/** Reads Playwright forward-proxy settings from process env (HTTP or SOCKS5). */
export function playwrightProxyFromEnv(
    env: NodeJS.ProcessEnv = process.env,
): PlaywrightProxyConfig | undefined {
    const server = env.PLAYWRIGHT_PROXY_SERVER?.trim();
    if (!server) return undefined;

    const username = env.PLAYWRIGHT_PROXY_USERNAME?.trim();
    const password = env.PLAYWRIGHT_PROXY_PASSWORD?.trim();

    return {
        server,
        ...(username && password ? { username, password } : {}),
    };
}
