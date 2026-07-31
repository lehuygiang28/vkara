'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { KaraokeScorer, type LiveFrame, type FinalScore } from '@/lib/karaoke-scorer';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { useKaraokeStore } from '@/store/karaokeStore';

const FRAME_SIZE = 2048;
const SAMPLE_RATE = 44100;

/** Payload shape embedded in sendMessage content. */
export interface KaraokeScorePayload {
    _vkaraKaraokeScore: true;
    score: FinalScore;
    dismissDurationSec: number;
}

/** Returns true if any participant in the room is a TV connection. */
function hasTvInRoom(): boolean {
    const room = useYouTubeStore.getState().room;
    if (!room) return false;
    return Object.values(room.participants).some((p) => p.isTvConnection);
}

const INITIAL_FRAME: LiveFrame = { pitchHz: 0, isVoiceDetected: false };

export function useKaraokeScoring() {
    const [isScoring, setIsScoring] = useState(false);
    const [liveFrame, setLiveFrame] = useState<LiveFrame>(INITIAL_FRAME);
    const [finalScore, setFinalScore] = useState<FinalScore | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scorerRef = useRef(new KaraokeScorer(SAMPLE_RATE, 3, FRAME_SIZE));
    const isScoringRef = useRef(isScoring);
    isScoringRef.current = isScoring;

    const stopMic = useCallback(() => {
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        void audioCtxRef.current?.close();
        processorRef.current = null;
        sourceRef.current = null;
        streamRef.current = null;
        audioCtxRef.current = null;
        setIsScoring(false);
    }, []);

    const maybeShowScore = useCallback(() => {
        if (!isScoringRef.current || !scorerRef.current.hasData) return;

        const score = scorerRef.current.computeFinalScore();
        scorerRef.current.reset();

        const tvPresent = hasTvInRoom();
        const showOnPhone = useKaraokeStore.getState().showScoreOnPhone;
        const dismissDurationSec = useKaraokeStore.getState().dismissDurationSec;

        if (tvPresent) {
            const payload: KaraokeScorePayload = {
                _vkaraKaraokeScore: true,
                score,
                dismissDurationSec,
            };
            useWebSocketStore.getState().sendMessage({
                type: 'sendMessage',
                message: JSON.stringify(payload),
            });
        }

        // Show on phone if: no TV present, or user opted-in via setting.
        if (!tvPresent || showOnPhone) {
            setFinalScore(score);
        }
    }, []);

    // Trigger 1: song advanced to next (playingNow.id changed).
    const playingVideoId = useYouTubeStore((s) => s.room?.playingNow?.id);
    const prevVideoIdRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        const prev = prevVideoIdRef.current;
        prevVideoIdRef.current = playingVideoId;
        if (prev !== undefined && prev !== playingVideoId) maybeShowScore();
    }, [playingVideoId, maybeShowScore]);

    // Trigger 2: playback stopped and song was ≥75% complete (natural end without queue).
    const isPlaying = useYouTubeStore((s) => s.room?.isPlaying ?? false);
    const prevIsPlayingRef = useRef(false);
    useEffect(() => {
        const wasPlaying = prevIsPlayingRef.current;
        prevIsPlayingRef.current = isPlaying;

        if (!wasPlaying || isPlaying) return; // only care about true → false

        const room = useYouTubeStore.getState().room;
        const dur = room?.playingNow?.duration ?? 0;
        const cur = room?.currentTime ?? 0;
        const nearEnd = dur > 0 && cur / dur >= 0.75;
        if (nearEnd) maybeShowScore();
    }, [isPlaying, maybeShowScore]);

    const stop = useCallback((andScore = false) => {
        if (andScore && isScoringRef.current && scorerRef.current.hasData) {
            setFinalScore(scorerRef.current.computeFinalScore());
        }
        scorerRef.current.reset();
        stopMic();
    }, [stopMic]);

    const start = useCallback(async () => {
        if (isScoring) return;
        setError(null);
        setFinalScore(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
            });
            streamRef.current = stream;

            const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = ctx.createScriptProcessor(FRAME_SIZE, 1, 1);
            processorRef.current = processor;

            scorerRef.current.reset();

            processor.onaudioprocess = (event) => {
                // Skip scoring when no song is playing (silence between songs).
                if (!useYouTubeStore.getState().room?.isPlaying) return;
                const samples = event.inputBuffer.getChannelData(0);
                const frame = scorerRef.current.processFrame(samples, ctx.sampleRate);
                setLiveFrame({ ...frame });
            };

            // Mute gain node to prevent mic feedback through speakers.
            const silentGain = ctx.createGain();
            silentGain.gain.value = 0;
            source.connect(processor);
            processor.connect(silentGain);
            silentGain.connect(ctx.destination);

            setIsScoring(true);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'mic_permission_denied',
            );
        }
    }, [isScoring]);

    const dismissScore = useCallback(() => setFinalScore(null), []);

    useEffect(() => {
        return () => { stopMic(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { isScoring, liveFrame, finalScore, error, start, stop, dismissScore };
}
