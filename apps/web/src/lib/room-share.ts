import { buildShareableRoomUrl } from '@vkara/shared-utils';

import { buildLocaleSharePath, type AppLocale } from '@/lib/locale-path';

/**
 * Shareable invite URL for QR codes and copy (origin + `/vi` or `/en` + query).
 * Uses locale only — never the current pathname — so switching language cannot
 * produce glued paths like `/vien`.
 */
export function generateShareableUrl({
    roomId,
    password,
    locale,
}: {
    roomId: string;
    password: string;
    locale: AppLocale;
}): string {
    const baseUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${buildLocaleSharePath(locale)}`
            : '';

    return buildShareableRoomUrl({
        baseUrl,
        roomId,
        password,
    });
}
