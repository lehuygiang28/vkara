const SCROLL_TOP_EPSILON = 2;

export function scrollTvSettingsToTop(container: HTMLElement | null) {
    container?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function peekTvSettingsScrollUp(container: HTMLElement | null): boolean {
    if (!container || container.scrollTop <= SCROLL_TOP_EPSILON) {
        return true;
    }

    scrollTvSettingsToTop(container);
    return false;
}

/** Keep focused row visible inside the settings scroll container. */
export function scrollTvSettingsItemIntoView(
    container: HTMLElement | null,
    item: HTMLElement | null,
) {
    if (!container || !item) {
        return;
    }

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const padding = 12;

    if (itemRect.top < containerRect.top + padding) {
        container.scrollTop -= containerRect.top + padding - itemRect.top;
        return;
    }

    if (itemRect.bottom > containerRect.bottom - padding) {
        container.scrollTop += itemRect.bottom - containerRect.bottom + padding;
    }
}
