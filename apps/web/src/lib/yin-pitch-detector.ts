/**
 * YIN pitch detection algorithm (TypeScript port from Frank Karaoke / Dart).
 * Reference: "YIN, a fundamental frequency estimator for speech and music"
 * by Alain de Cheveigné and Hideki Kawahara (2002).
 */

export interface PitchResult {
    pitchHz: number;
    confidence: number;
}

export const NO_PITCH: PitchResult = { pitchHz: 0, confidence: 0 };

/**
 * Detect fundamental frequency from a PCM audio frame.
 * @param samples  Float32Array of mono PCM samples
 * @param sampleRate  Audio sample rate (default 44100)
 * @param threshold  YIN threshold 0.0–1.0. Higher = more permissive (0.30 works
 *                   well for mixed voice+music from a nearby speaker).
 */
export function detectPitch(
    samples: Float32Array,
    sampleRate = 44100,
    threshold = 0.3,
): PitchResult {
    const halfLen = Math.floor(samples.length / 2);
    if (halfLen < 2) return NO_PITCH;

    const diff = differenceFunction(samples, halfLen);
    const cmndf = cumulativeMeanNormalized(diff, halfLen);
    const found = absoluteThreshold(cmndf, halfLen, threshold, sampleRate);
    if (!found) return NO_PITCH;

    const [tau, cmndfMin] = found;
    const betterTau = parabolicInterpolation(cmndf, tau, halfLen);
    if (betterTau <= 0) return NO_PITCH;

    const pitchHz = sampleRate / betterTau;
    const confidence = Math.max(0, Math.min(1, 1 - cmndfMin / threshold));
    return { pitchHz, confidence };
}

/** RMS energy of a frame — used for silence detection. */
export function rmsEnergy(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (const s of samples) sum += s * s;
    return Math.sqrt(sum / samples.length);
}

// --- YIN internals ---

function differenceFunction(samples: Float32Array, halfLen: number): Float64Array {
    const diff = new Float64Array(halfLen);
    for (let tau = 1; tau < halfLen; tau++) {
        let sum = 0;
        for (let i = 0; i < halfLen; i++) {
            const delta = (samples[i] ?? 0) - (samples[i + tau] ?? 0);
            sum += delta * delta;
        }
        diff[tau] = sum;
    }
    return diff;
}

function cumulativeMeanNormalized(diff: Float64Array, halfLen: number): Float64Array {
    const cmndf = new Float64Array(halfLen);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfLen; tau++) {
        runningSum += diff[tau] ?? 0;
        cmndf[tau] = runningSum > 0 ? ((diff[tau] ?? 0) * tau) / runningSum : 0;
    }
    return cmndf;
}

function absoluteThreshold(
    cmndf: Float64Array,
    halfLen: number,
    threshold: number,
    sampleRate: number,
): [number, number] | null {
    // Limit search to human vocal range: ~80 Hz – 1100 Hz
    const minTau = Math.floor(sampleRate / 1100);
    const maxTau = Math.min(halfLen - 1, Math.floor(sampleRate / 80));
    for (let tau = minTau; tau < maxTau; tau++) {
        if ((cmndf[tau] ?? 1) < threshold) {
            while (tau + 1 < maxTau && (cmndf[tau + 1] ?? 1) < (cmndf[tau] ?? 1)) tau++;
            return [tau, cmndf[tau] ?? 0];
        }
    }
    return null;
}

function parabolicInterpolation(cmndf: Float64Array, tau: number, halfLen: number): number {
    if (tau <= 0 || tau >= halfLen - 1) return tau;
    const s0 = cmndf[tau - 1] ?? 0;
    const s1 = cmndf[tau] ?? 0;
    const s2 = cmndf[tau + 1] ?? 0;
    const denominator = 2 * s1 - s2 - s0;
    if (Math.abs(denominator) < 1e-10) return tau;
    return tau + (s2 - s0) / (2 * denominator);
}
