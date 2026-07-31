/**
 * Karaoke scoring engine — song-level scoring (0–100).
 * Collects stats throughout the song, computes a final score when the song ends.
 *
 * Three dimensions (matching "đúng nốt / đúng tone / đúng nhịp"):
 *  - Coverage  (nhịp)  — are you singing during vocal sections?
 *  - Stability (tone)  — are your pitches confident and steady?
 *  - Variety   (nốt)   — are you covering a range of notes?
 */

import { detectPitch, rmsEnergy } from './yin-pitch-detector';

/** Per-frame live feedback (shown while song is playing). */
export interface LiveFrame {
    pitchHz: number;
    isVoiceDetected: boolean;
}

/** Final score shown at song end. All values 0–100. */
export interface FinalScore {
    /** Overall score (0–100), typical range 55–98 for active singers. */
    total: number;
    /** Singing time coverage (nhịp): 0–40. */
    coverage: number;
    /** Pitch confidence/steadiness (tone): 0–35. */
    stability: number;
    /** Melodic variety / note range (nốt): 0–25. */
    variety: number;
}

const MIN_VOICE_HZ = 80;
const MAX_VOICE_HZ = 1100;
const SILENCE_RMS = 0.010;
const MIN_CONFIDENCE = 0.45;

export class KaraokeScorer {
    private voicedFrames = 0;
    private totalFrames = 0;
    private pitchConfidenceSum = 0;
    private readonly uniqueSemitones = new Set<number>();
    private frameCount = 0;
    private readonly warmupFrames: number;

    constructor(sampleRate = 44100, warmupSeconds = 3, frameSize = 2048) {
        this.warmupFrames = Math.ceil((warmupSeconds * sampleRate) / frameSize);
    }

    reset() {
        this.voicedFrames = 0;
        this.totalFrames = 0;
        this.pitchConfidenceSum = 0;
        this.uniqueSemitones.clear();
        this.frameCount = 0;
    }

    get hasData(): boolean {
        // Frames are only counted while isPlaying=true (gated in onaudioprocess),
        // so totalFrames stays 0 between songs — no false positives from silence.
        return this.totalFrames > 30;
    }

    processFrame(samples: Float32Array, sampleRate = 44100): LiveFrame {
        this.frameCount++;
        if (this.frameCount <= this.warmupFrames) return { pitchHz: 0, isVoiceDetected: false };

        this.totalFrames++;

        if (rmsEnergy(samples) < SILENCE_RMS) {
            return { pitchHz: 0, isVoiceDetected: false };
        }

        const { pitchHz, confidence } = detectPitch(samples, sampleRate, 0.3);
        const isVoice =
            pitchHz >= MIN_VOICE_HZ && pitchHz <= MAX_VOICE_HZ && confidence >= MIN_CONFIDENCE;

        if (isVoice) {
            this.voicedFrames++;
            this.pitchConfidenceSum += confidence;
            // Track which of the 12 semitone pitch classes the singer hits
            const semitone = Math.round(12 * Math.log2(pitchHz / 16.352)) % 12;
            this.uniqueSemitones.add((semitone + 12) % 12);
        }

        return { pitchHz: isVoice ? pitchHz : 0, isVoiceDetected: isVoice };
    }

    /**
     * Compute the final 0–100 score for the song just performed.
     * Call this when the song ends (playingNow changes to the next video).
     */
    computeFinalScore(): FinalScore {
        if (this.totalFrames === 0) return { total: 0, coverage: 0, stability: 0, variety: 0 };

        // Coverage (0–40): target is singing ~40% of total frames (the rest is instrumental).
        const coverageRatio = this.voicedFrames / this.totalFrames;
        const coverage = Math.round(Math.min(coverageRatio / 0.40, 1) * 40);

        // Scale factor: below 15% voiced = singer barely sang → tone/variety near 0.
        // This prevents background music (low voiced%) from inflating Tone/Nốt scores.
        const scaleFactor = Math.min(coverageRatio / 0.15, 1);

        // Stability (0–35): average YIN confidence when voiced, weighted by how much was sung.
        const avgConfidence =
            this.voicedFrames > 0 ? this.pitchConfidenceSum / this.voicedFrames : 0;
        const stability = Math.round(avgConfidence * 35 * scaleFactor);

        // Variety (0–25): unique semitone pitch classes (needs 12 for full score),
        // also weighted by scaleFactor so silence → near 0.
        const variety = Math.round(Math.min(this.uniqueSemitones.size / 12, 1) * 25 * scaleFactor);

        // Final: straight 0–100 — no singing = 0 points.
        const total = Math.min(coverage + stability + variety, 100);

        return { total, coverage, stability, variety };
    }
}
