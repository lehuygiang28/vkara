'use client';

import { useEffect, useState } from 'react';

import type { FinalScore } from '@/lib/karaoke-scorer';
import type { KaraokeScorePayload } from '@/hooks/use-karaoke-scoring';
import { useWebSocketStore } from '@/store/websocketStore';

interface IncomingScore {
    score: FinalScore;
    dismissDurationSec: number;
}

/** Parses a raw WS message content string as a KaraokeScorePayload. Returns null if not a score. */
function parseKaraokeScore(content: string): IncomingScore | null {
    try {
        const parsed = JSON.parse(content) as KaraokeScorePayload;
        if (parsed._vkaraKaraokeScore !== true) return null;
        return { score: parsed.score, dismissDurationSec: parsed.dismissDurationSec };
    } catch {
        return null;
    }
}

/**
 * Listens for karaoke score messages broadcast from the scorer phone.
 * Returns the latest score to display, and a dismiss callback.
 */
export function useTvKaraokeScore() {
    const [incomingScore, setIncomingScore] = useState<IncomingScore | null>(null);

    useEffect(() => {
        let prevLastMessage = useWebSocketStore.getState().lastMessage;

        return useWebSocketStore.subscribe((state) => {
            if (state.lastMessage === prevLastMessage) return;
            prevLastMessage = state.lastMessage;
            const msg = state.lastMessage;
            if (!msg || msg.type !== 'message') return;

            const parsed = parseKaraokeScore(msg.content);
            if (parsed) setIncomingScore(parsed);
        });
    }, []);

    const dismiss = () => setIncomingScore(null);

    return { incomingScore, dismiss };
}
