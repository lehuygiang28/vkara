import { createContextLogger } from '@/utils/logger';
import {
    relatedInstances,
    searchInstances,
} from '@/modules/youtube/cache';

const reportLogger = createContextLogger('Service/Report');

interface LatestSearchEntry {
    query: string;
    at: string;
}

interface HourlyCounters {
    searchRequests: number;
    relatedRequests: number;
    roomsReleased: number;
    orphanedClientsRemoved: number;
    searchInstancesCleaned: number;
    relatedInstancesCleaned: number;
}

const queryCounts = new Map<string, number>();
const latestSearches: LatestSearchEntry[] = [];

const hourly: HourlyCounters = {
    searchRequests: 0,
    relatedRequests: 0,
    roomsReleased: 0,
    orphanedClientsRemoved: 0,
    searchInstancesCleaned: 0,
    relatedInstancesCleaned: 0,
};

export function recordSearchRequest(query: string, isContinuation: boolean) {
    hourly.searchRequests++;
    if (!isContinuation) {
        queryCounts.set(query, (queryCounts.get(query) ?? 0) + 1);
        latestSearches.unshift({ query, at: new Date().toISOString() });
        if (latestSearches.length > 10) {
            latestSearches.length = 10;
        }
    }
}

export function recordRelatedRequest() {
    hourly.relatedRequests++;
}

export function recordRoomReleased(count = 1) {
    hourly.roomsReleased += count;
}

export function recordOrphanedClientsRemoved(count: number) {
    hourly.orphanedClientsRemoved += count;
}

export function recordMemoryCleanup(cleanedSearch: number, cleanedRelated: number) {
    hourly.searchInstancesCleaned += cleanedSearch;
    hourly.relatedInstancesCleaned += cleanedRelated;
}

function getTopSearches(limit: number) {
    return [...queryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));
}

function resetHourlyCounters() {
    hourly.searchRequests = 0;
    hourly.relatedRequests = 0;
    hourly.roomsReleased = 0;
    hourly.orphanedClientsRemoved = 0;
    hourly.searchInstancesCleaned = 0;
    hourly.relatedInstancesCleaned = 0;
    queryCounts.clear();
    latestSearches.length = 0;
}

export function emitHourlyReport(snapshot: {
    totalRooms: number;
    activeRooms: number;
    totalClientRecords: number;
    connectedClients: number;
}) {
    const topSearches = getTopSearches(10);
    const latest = [...latestSearches];

    const summary = [
        `rooms ${snapshot.activeRooms}/${snapshot.totalRooms} active`,
        `clients ${snapshot.connectedClients} connected (${snapshot.totalClientRecords} records)`,
        `cleanup ${hourly.roomsReleased} rooms, ${hourly.orphanedClientsRemoved} orphaned clients, ${hourly.searchInstancesCleaned} search + ${hourly.relatedInstancesCleaned} related instances`,
        `youtube ${hourly.searchRequests} search / ${hourly.relatedRequests} related requests`,
        `cache ${searchInstances.size} search / ${relatedInstances.size} related`,
    ].join(' | ');

    reportLogger.info(`Hourly service report — ${summary}`, {
        rooms: {
            total: snapshot.totalRooms,
            active: snapshot.activeRooms,
        },
        clients: {
            connected: snapshot.connectedClients,
            records: snapshot.totalClientRecords,
        },
        cleanup: {
            roomsReleased: hourly.roomsReleased,
            orphanedClientsRemoved: hourly.orphanedClientsRemoved,
            searchInstancesCleaned: hourly.searchInstancesCleaned,
            relatedInstancesCleaned: hourly.relatedInstancesCleaned,
        },
        youtube: {
            searchRequests: hourly.searchRequests,
            relatedRequests: hourly.relatedRequests,
            searchCacheSize: searchInstances.size,
            relatedCacheSize: relatedInstances.size,
        },
        topSearches,
        latestSearches: latest,
    });

    resetHourlyCounters();
}
