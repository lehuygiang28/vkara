import { stripLocaleFromPath } from '@/lib/locale-path';

/** True when the user is on the dedicated Smart TV display route (`/tv` or `/en/tv`). */
export function isDedicatedTvRoute(pathname: string): boolean {
    const { cleanPath } = stripLocaleFromPath(pathname);
    return cleanPath === '/tv' || cleanPath.startsWith('/tv/');
}
