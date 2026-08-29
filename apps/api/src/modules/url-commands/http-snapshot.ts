import type { Participant, Room } from '@vkara/room';

import { cleanUpRoomField } from '@/utils/common';

type AgentHttpParticipant = Omit<Participant, 'deviceId' | 'connectionIds'> & {
    isAgent: boolean;
};

export function cleanRoomForAgentHttp(room: Room) {
    const cleaned = cleanUpRoomField(room);
    const participants: Record<string, AgentHttpParticipant> = {};
    Object.values(cleaned.participants).forEach((participant, index) => {
        participants[`p${index}`] = {
            displayName: participant.displayName,
            role: participant.role,
            joinedAt: participant.joinedAt,
            lastSeen: participant.lastSeen,
            isTvConnection: participant.isTvConnection,
            isAgent: participant.isAgent,
        };
    });
    return {
        id: cleaned.id,
        hasPassword: cleaned.hasPassword,
        videoQueue: cleaned.videoQueue,
        historyQueue: cleaned.historyQueue,
        volume: cleaned.volume,
        showQRInPlayer: cleaned.showQRInPlayer,
        captionsEnabled: cleaned.captionsEnabled,
        captionsLanguage: cleaned.captionsLanguage,
        playingNow: cleaned.playingNow,
        isPlaying: cleaned.isPlaying,
        currentTime: cleaned.currentTime,
        locked: cleaned.locked,
        participants,
        youAreHost: false as const,
    };
}
