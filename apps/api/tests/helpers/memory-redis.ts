type Stored = { value: string; expiresAt?: number };

export function memoryRedis() {
    const map = new Map<string, Stored>();
    const sets = new Map<string, Set<string>>();

    function alive(key: string): Stored | undefined {
        const row = map.get(key);
        if (!row) return undefined;
        if (row.expiresAt && row.expiresAt <= Date.now()) {
            map.delete(key);
            return undefined;
        }
        return row;
    }

    return {
        async get(key: string) {
            return alive(key)?.value ?? null;
        },
        async set(key: string, value: string, ...args: unknown[]) {
            let nx = false;
            let ttl: number | undefined;
            for (let i = 0; i < args.length; i++) {
                if (args[i] === 'NX') nx = true;
                if (args[i] === 'EX') ttl = Number(args[i + 1]);
            }
            if (nx && alive(key)) {
                return null;
            }
            map.set(key, {
                value,
                expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
            });
            return 'OK';
        },
        async getdel(key: string) {
            const value = alive(key)?.value ?? null;
            map.delete(key);
            return value;
        },
        async del(key: string) {
            map.delete(key);
            return 1;
        },
        async exists(key: string) {
            return alive(key) ? 1 : 0;
        },
        async incr(key: string) {
            const current = Number(alive(key)?.value ?? '0');
            const next = current + 1;
            const prev = map.get(key);
            map.set(key, { value: String(next), expiresAt: prev?.expiresAt });
            return next;
        },
        async expire(key: string, ttl: number) {
            const row = map.get(key);
            if (!row) return 0;
            row.expiresAt = Date.now() + ttl * 1000;
            return 1;
        },
        async sadd(key: string, member: string) {
            const set = sets.get(key) ?? new Set();
            const size = set.size;
            set.add(member);
            sets.set(key, set);
            return set.size === size ? 0 : 1;
        },
        async srem(key: string, member: string) {
            return sets.get(key)?.delete(member) ? 1 : 0;
        },
        async scard(key: string) {
            return sets.get(key)?.size ?? 0;
        },
    };
}
