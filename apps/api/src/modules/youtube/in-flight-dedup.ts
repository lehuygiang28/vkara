/** Coalesce concurrent async work by key (e.g. same videoId or channelId). */
export function createInFlightDedup<K, V>() {
    const inFlight = new Map<K, Promise<V>>();

    return {
        run(key: K, factory: () => Promise<V>): Promise<V> {
            const existing = inFlight.get(key);
            if (existing) {
                return existing;
            }

            const promise = factory().finally(() => {
                inFlight.delete(key);
            });
            inFlight.set(key, promise);
            return promise;
        },
    };
}
