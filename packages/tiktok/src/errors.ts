/** TikTok returned HTTP 200 with an empty body on the first search probe. */
export class TikTokEmptyProbeError extends Error {
    constructor(keyword: string) {
        super(`Empty probe response for "${keyword}"`);
        this.name = 'TikTokEmptyProbeError';
    }
}
