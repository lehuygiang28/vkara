/** Filters stale server echoes while the user adjusts a remote-controlled value. */

type PendingRemoteValue = {
    target: number;
    from: number;
};

type RemoteValueGestureSync = {
    beginGesture: (fromValue: number) => void;
    endGesture: (finalValue: number) => void;
    shouldApplyRemote: (remoteValue: number) => boolean;
    resetForTests: () => void;
};

function createRemoteValueGestureSync(): RemoteValueGestureSync {
    let gestureActive = false;
    let gestureFromValue: number | null = null;
    let pendingRemoteValue: PendingRemoteValue | null = null;

    return {
        beginGesture(fromValue: number) {
            gestureActive = true;
            gestureFromValue = Math.max(0, Math.floor(fromValue));
            pendingRemoteValue = null;
        },
        endGesture(finalValue: number) {
            gestureActive = false;
            const target = Math.max(0, Math.floor(finalValue));
            pendingRemoteValue = {
                target,
                from: gestureFromValue ?? target,
            };
        },
        shouldApplyRemote(remoteValue: number) {
            const remote = Math.max(0, Math.floor(remoteValue));

            if (gestureActive) {
                return false;
            }

            if (pendingRemoteValue === null) {
                return true;
            }

            if (remote === pendingRemoteValue.target) {
                pendingRemoteValue = null;
                gestureFromValue = null;
                return true;
            }

            if (remote === pendingRemoteValue.from) {
                return false;
            }

            pendingRemoteValue = null;
            gestureFromValue = null;
            return true;
        },
        resetForTests() {
            gestureActive = false;
            gestureFromValue = null;
            pendingRemoteValue = null;
        },
    };
}

const volumeGestureSync = createRemoteValueGestureSync();

export const beginVolumeGesture = (fromVolume: number): void => {
    volumeGestureSync.beginGesture(fromVolume);
};

export const endVolumeGesture = (finalVolume: number): void => {
    volumeGestureSync.endGesture(finalVolume);
};

export const shouldApplyRemoteVolumeChange = (remoteVolume: number): boolean => {
    return volumeGestureSync.shouldApplyRemote(remoteVolume);
};

export const resetVolumeRemoteSyncForTests = (): void => {
    volumeGestureSync.resetForTests();
};
