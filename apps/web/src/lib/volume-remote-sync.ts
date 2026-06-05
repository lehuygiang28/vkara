/** Coordinates local volume gestures with server `volumeChanged` echoes. */

const REMOTE_VOLUME_ECHO_MS = 800;

let gestureActive = false;
let expectedRemoteVolume: number | null = null;
let expectedRemoteVolumeUntil = 0;

export function beginVolumeGesture(): void {
    gestureActive = true;
}

export function markVolumeSentToRoom(volume: number): void {
    expectedRemoteVolume = volume;
    expectedRemoteVolumeUntil = Date.now() + REMOTE_VOLUME_ECHO_MS;
}

export function endVolumeGesture(finalVolume: number): void {
    gestureActive = false;
    markVolumeSentToRoom(finalVolume);
}

export function shouldApplyRemoteVolumeChange(remoteVolume: number): boolean {
    if (gestureActive) {
        return false;
    }

    if (expectedRemoteVolume !== null && Date.now() < expectedRemoteVolumeUntil) {
        if (remoteVolume === expectedRemoteVolume) {
            expectedRemoteVolume = null;
            return true;
        }
        return false;
    }

    expectedRemoteVolume = null;
    return true;
}

/** Test helper */
export function resetVolumeRemoteSyncForTests(): void {
    gestureActive = false;
    expectedRemoteVolume = null;
    expectedRemoteVolumeUntil = 0;
}
