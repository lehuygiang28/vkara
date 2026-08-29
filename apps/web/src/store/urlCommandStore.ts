import { create } from 'zustand';
import type { ParseUrlCommandsResult } from '@vkara/url-commands';
import type { UrlCommandDocument } from '@vkara/validators';

type UrlCommandState = {
    snapshot: ParseUrlCommandsResult | null;
    createdAt: number;
    setSnapshot: (snapshot: ParseUrlCommandsResult) => void;
    clearSecrets: () => void;
};

function mergePreservedSecrets(
    previous: UrlCommandDocument | undefined,
    next: UrlCommandDocument,
): UrlCommandDocument {
    if (!previous) {
        return next;
    }
    if (previous.roomId && next.roomId && previous.roomId !== next.roomId) {
        return next;
    }
    // Only keep in-flight invite secrets while roomId is still on the document.
    if (!next.roomId) {
        return next;
    }
    return {
        ...next,
        password: next.password ?? previous.password,
        joinToken: next.joinToken ?? previous.joinToken,
        name: next.name ?? previous.name,
        once: next.once ?? previous.once,
    };
}

export const useUrlCommandStore = create<UrlCommandState>((set, get) => ({
    snapshot: null,
    createdAt: 0,
    setSnapshot: (snapshot) => {
        const previous = get().snapshot;
        const document = mergePreservedSecrets(previous?.document, snapshot.document);
        const next = { ...snapshot, document };
        if (
            previous &&
            previous.unknownKeys.join() === next.unknownKeys.join() &&
            previous.reservedKeys.join() === next.reservedKeys.join() &&
            JSON.stringify(previous.document) === JSON.stringify(next.document)
        ) {
            return;
        }
        set({
            snapshot: next,
            createdAt: Date.now(),
        });
    },
    clearSecrets: () => {
        const previous = get().snapshot;
        if (!previous) {
            return;
        }
        const rest = { ...previous.document };
        delete rest.password;
        delete rest.joinToken;
        delete rest.once;
        set({
            snapshot: { ...previous, document: rest },
        });
    },
}));
