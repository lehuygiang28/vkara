import type { YouTubeVideo } from '@vkara/youtube';
import { normalizeVideoChannels } from '@vkara/youtube';
import { normalizePersistedRoom } from '@vkara/room';
import type { StateStorage } from 'zustand/middleware';

/** Zustand persist blob shape. */
type PersistEnvelope = {
    state?: unknown;
    version?: number;
};

const LEGACY_KEY_ALIASES: Record<string, string> = {
    youtubeStore: 'youtube-storage',
};

export const PERSIST_STORE_KEYS = {
    youtube: 'youtube-storage',
    personalization: 'vkara-personalization',
    search: 'search-store',
    appSettings: 'vkara-app-settings',
    rejoinSecrets: 'vkara-room-rejoin-secrets',
} as const;

export function normalizePersistedYouTubeVideo(video: unknown): YouTubeVideo | null {
    if (!video || typeof video !== 'object') {
        return null;
    }

    const candidate = video as Partial<YouTubeVideo>;
    if (typeof candidate.id !== 'string' || !candidate.id) {
        return null;
    }

    return {
        id: candidate.id,
        title: typeof candidate.title === 'string' ? candidate.title : candidate.id,
        duration: typeof candidate.duration === 'number' ? candidate.duration : 0,
        duration_formatted:
            typeof candidate.duration_formatted === 'string'
                ? candidate.duration_formatted
                : '0:00',
        type: candidate.type ?? 'video',
        uploadedAt: typeof candidate.uploadedAt === 'string' ? candidate.uploadedAt : '',
        url:
            typeof candidate.url === 'string'
                ? candidate.url
                : `https://www.youtube.com/watch?v=${candidate.id}`,
        views: typeof candidate.views === 'number' ? candidate.views : 0,
        channels: normalizeVideoChannels(candidate),
        thumbnails: Array.isArray(candidate.thumbnails) ? candidate.thumbnails : [],
        ...(candidate.isLive === undefined ? {} : { isLive: candidate.isLive }),
        ...(candidate.source === 'tiktok' || candidate.source === 'youtube'
            ? { source: candidate.source }
            : {}),
        ...(typeof candidate.tiktokImageCount === 'number' &&
        Number.isInteger(candidate.tiktokImageCount) &&
        candidate.tiktokImageCount > 0
            ? { tiktokImageCount: candidate.tiktokImageCount }
            : {}),
    };
}

function migrateStoreState(name: string, state: unknown): unknown {
    if (!state || typeof state !== 'object') {
        return state;
    }

    switch (name) {
        case PERSIST_STORE_KEYS.youtube: {
            const youtube = state as {
                room?: {
                    id?: string;
                    password?: string;
                    hasPassword?: boolean;
                    showQRInPlayer?: boolean;
                    captionsEnabled?: boolean;
                    captionsLanguage?: string;
                } | null;
                layoutModeSource?: string;
                layoutMode?: string;
            };
            // Cold rejoin stub only — strip hot playback/queue fields from legacy blobs.
            const room = normalizePersistedRoom(
                youtube.room
                    ? {
                          id: youtube.room.id,
                          password: youtube.room.password,
                          hasPassword: youtube.room.hasPassword,
                          showQRInPlayer: youtube.room.showQRInPlayer,
                          captionsEnabled: youtube.room.captionsEnabled,
                          captionsLanguage: youtube.room.captionsLanguage,
                      }
                    : null,
            );
            return {
                ...youtube,
                room,
                layoutModeSource: youtube.layoutModeSource ?? 'auto',
                tvSuppressAutoCreate: false,
                tvLobbyBanner: null,
                player: null,
            };
        }
        case PERSIST_STORE_KEYS.personalization: {
            const personalization = state as {
                searchHistory?: unknown;
                channelScores?: unknown;
                recentVideos?: unknown;
            };
            const searchHistory = Array.isArray(personalization.searchHistory)
                ? personalization.searchHistory.filter(
                      (entry) =>
                          entry &&
                          typeof entry === 'object' &&
                          typeof (entry as { query?: string }).query === 'string',
                  )
                : [];
            const channelScores =
                personalization.channelScores &&
                typeof personalization.channelScores === 'object' &&
                !Array.isArray(personalization.channelScores)
                    ? (personalization.channelScores as Record<string, number>)
                    : {};
            const recentVideos = Array.isArray(personalization.recentVideos)
                ? personalization.recentVideos
                      .map(normalizePersistedYouTubeVideo)
                      .filter((video): video is YouTubeVideo => video !== null)
                : [];

            return {
                searchHistory,
                channelScores,
                recentVideos,
            };
        }
        default:
            return state;
    }
}

const YOUTUBE_PERSIST_VERSION = 2;

function migrateEnvelope(name: string, envelope: PersistEnvelope): PersistEnvelope {
    const version = typeof envelope.version === 'number' ? envelope.version : 0;
    const migratedState = migrateStoreState(name, envelope.state);
    const targetVersion =
        name === PERSIST_STORE_KEYS.youtube ? YOUTUBE_PERSIST_VERSION : Math.max(version, 1);

    if (version >= targetVersion && migratedState === envelope.state) {
        return envelope;
    }

    return {
        state: migratedState,
        version: targetVersion,
    };
}

function parsePersistEnvelope(raw: string): PersistEnvelope | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        return parsed as PersistEnvelope;
    } catch {
        return null;
    }
}

function backupKey(name: string): string {
    return `${name}.bak`;
}

function quarantineKey(name: string): string {
    return `${name}.bad`;
}

function storageSet(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}

function rememberGood(name: string, raw: string): void {
    if (localStorage.getItem(backupKey(name)) === raw) {
        return;
    }
    storageSet(backupKey(name), raw);
}

function quarantineCorrupt(name: string, raw: string): void {
    if (!localStorage.getItem(quarantineKey(name))) {
        storageSet(quarantineKey(name), raw);
    }
    try {
        localStorage.removeItem(name);
    } catch {
        // The corrupt bytes stay on the primary key. The next read quarantines them again.
    }
}

function restoreBackup(name: string): string | null {
    const backup = localStorage.getItem(backupKey(name));
    if (!backup || !parsePersistEnvelope(backup)) {
        return null;
    }
    storageSet(name, backup);
    return backup;
}

function publishEnvelope(name: string, raw: string, envelope: PersistEnvelope): string {
    const migrated = migrateEnvelope(name, envelope);
    const serialized = JSON.stringify(migrated);
    if (serialized !== raw) {
        storageSet(name, serialized);
    }
    rememberGood(name, serialized);
    return serialized;
}

/**
 * Read one persisted store. A blob that does not parse is kept aside and, when a
 * previous good write exists, copied back onto the primary key.
 */
export function readClientPersistItem(name: string): string | null {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    runLegacyLocalStorageKeyMigration();

    const raw = localStorage.getItem(name);
    if (!raw) {
        const restored = restoreBackup(name);
        if (!restored) {
            return null;
        }
        const envelope = parsePersistEnvelope(restored);
        return envelope ? publishEnvelope(name, restored, envelope) : null;
    }

    const envelope = parsePersistEnvelope(raw);
    if (!envelope) {
        quarantineCorrupt(name, raw);
        const restored = restoreBackup(name);
        if (!restored) {
            return null;
        }
        const backupEnvelope = parsePersistEnvelope(restored);
        return backupEnvelope ? publishEnvelope(name, restored, backupEnvelope) : null;
    }

    return publishEnvelope(name, raw, envelope);
}

function writeClientPersistItem(name: string, value: string): void {
    if (typeof localStorage === 'undefined' || !parsePersistEnvelope(value)) {
        return;
    }

    const current = localStorage.getItem(name);
    if (current && current !== value && parsePersistEnvelope(current)) {
        rememberGood(name, current);
    }

    if (!storageSet(name, value)) {
        return;
    }
    rememberGood(name, value);
}

/** Copy legacy localStorage keys into the current names once. */
export function runLegacyLocalStorageKeyMigration(): void {
    if (typeof localStorage === 'undefined') {
        return;
    }

    for (const [legacyKey, targetKey] of Object.entries(LEGACY_KEY_ALIASES)) {
        if (!localStorage.getItem(targetKey) && localStorage.getItem(legacyKey)) {
            localStorage.setItem(targetKey, localStorage.getItem(legacyKey)!);
            localStorage.removeItem(legacyKey);
        }
    }
}

/**
 * Drop-in replacement for `localStorage` used by Zustand `createJSONStorage`.
 * Each successful write keeps a backup. A later read repairs the primary key from that backup.
 */
export function createMigratingPersistStorage(): StateStorage {
    return {
        getItem: (name) => readClientPersistItem(name),
        setItem: (name, value) => {
            writeClientPersistItem(name, value);
        },
        removeItem: (name) => {
            try {
                localStorage.removeItem(name);
                localStorage.removeItem(backupKey(name));
            } catch {
                // Leaving the key in place is safer than throwing out of hydration.
            }
        },
    };
}
