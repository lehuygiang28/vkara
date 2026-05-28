const CACHE_TTL_MS = 60 * 60 * 1000;

const embeddableCache = new Map<string, { value: boolean; expiresAt: number }>();

export const checkEmbeddable = async (videoId: string): Promise<boolean> => {
    const cached = embeddableCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const baseUrls = [`https://www.youtube-nocookie.com/embed/`, `https://www.youtube.com/embed/`];
    const errString = `Playback on other websites has been disabled by the video own`;
    const stringAbility = `previewPlayabilityStatus`;

    const url = `${baseUrls[Math.floor(Math.random() * baseUrls.length)]}${videoId}`;
    const raw = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
            'accept-language': 'en-US,en;q=0.9',
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        },
    });

    if (!raw.ok) {
        embeddableCache.set(videoId, { value: false, expiresAt: Date.now() + CACHE_TTL_MS });
        return false;
    }

    const text = await raw.text();
    const isEmbeddable = !text.includes(errString) && text.includes(stringAbility);
    embeddableCache.set(videoId, { value: isEmbeddable, expiresAt: Date.now() + CACHE_TTL_MS });
    return isEmbeddable;
};
