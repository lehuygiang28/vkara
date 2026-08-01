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

function normalizePersistedYouTubeVideo(video: unknown): YouTubeVideo | null {
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
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        return parsed as PersistEnvelope;
    } catch {
        return null;
    }
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
 * Migrates legacy blobs on read and clears corrupt entries instead of crashing hydration.
 */
export function createMigratingPersistStorage(): StateStorage {
    return {
        getItem: (name) => {
            runLegacyLocalStorageKeyMigration();

            const raw = localStorage.getItem(name);
            if (!raw) {
                return null;
            }

            const envelope = parsePersistEnvelope(raw);
            if (!envelope) {
                localStorage.removeItem(name);
                return null;
            }

            const migrated = migrateEnvelope(name, envelope);
            const serialized = JSON.stringify(migrated);

            if (serialized !== raw) {
                localStorage.setItem(name, serialized);
            }

            return serialized;
        },
        setItem: (name, value) => {
            localStorage.setItem(name, value);
        },
        removeItem: (name) => {
            localStorage.removeItem(name);
        },
    };
}
