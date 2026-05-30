/** Run async mapper over items with a max number of concurrent workers. */
export async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    if (items.length === 0) {
        return [];
    }

    const results = new Array<R>(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(Math.max(1, limit), items.length);

    const worker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            results[index] = await mapper(items[index]!, index);
        }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
}
