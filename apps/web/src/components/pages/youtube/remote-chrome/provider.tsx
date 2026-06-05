'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';

import {
    REMOTE_CHROME_DATASET,
    deriveLayoutPhase,
    type NowPlayingLayoutPhase,
} from '@/lib/remote-chrome';

import { useSyncRemoteChromeMeasurements } from './measurements';

type RemoteChromeMode =
    (typeof REMOTE_CHROME_DATASET.modes)[keyof typeof REMOTE_CHROME_DATASET.modes];

type RemoteChromeContextValue = {
    layoutPhase: NowPlayingLayoutPhase;
    animating: boolean;
    showNowPlayingBar: boolean;
    hasPlaying: boolean;
    navRef: RefObject<HTMLElement | null>;
    panelRef: RefObject<HTMLDivElement | null>;
    onBarAnimatingChange: (animating: boolean) => void;
    onBarAnimationComplete: (open: boolean) => void;
};

const RemoteChromeContext = createContext<RemoteChromeContextValue | null>(null);

export function useRemoteChromeContext() {
    const context = useContext(RemoteChromeContext);
    if (!context) {
        throw new Error('Remote chrome hooks must be used within RemoteChromeProvider');
    }
    return context;
}

export function useNowPlayingLayoutPhase(): NowPlayingLayoutPhase {
    return useRemoteChromeContext().layoutPhase;
}

export function useNowPlayingAnimating(): boolean {
    return useRemoteChromeContext().animating;
}

interface RemoteChromeProviderProps {
    mode: RemoteChromeMode;
    hasPlaying: boolean;
    showNowPlayingBar: boolean;
    children: ReactNode;
}

/** Owns remote chrome policy, measurement refs, CSS var sync, and animation lifecycle. */
export function RemoteChromeProvider({
    mode,
    hasPlaying,
    showNowPlayingBar,
    children,
}: RemoteChromeProviderProps) {
    const navRef = useRef<HTMLElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [measureBarHeight, setMeasureBarHeight] = useState(showNowPlayingBar);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (showNowPlayingBar) {
            setMeasureBarHeight(true);
        }
    }, [showNowPlayingBar]);

    useEffect(() => {
        const root = document.documentElement;
        root.dataset[REMOTE_CHROME_DATASET.attribute] = mode;
        return () => {
            delete root.dataset[REMOTE_CHROME_DATASET.attribute];
        };
    }, [mode]);

    useSyncRemoteChromeMeasurements(
        { navRef, panelRef },
        {
            measureBarHeight,
            reserveContentInset: showNowPlayingBar,
            hasPlaying,
        },
    );

    const onBarAnimationComplete = useCallback((open: boolean) => {
        if (!open) {
            setMeasureBarHeight(false);
        }
    }, []);

    const layoutPhase = deriveLayoutPhase(showNowPlayingBar, measureBarHeight);

    const value = useMemo<RemoteChromeContextValue>(
        () => ({
            layoutPhase,
            animating,
            showNowPlayingBar,
            hasPlaying,
            navRef,
            panelRef,
            onBarAnimatingChange: setAnimating,
            onBarAnimationComplete,
        }),
        [
            layoutPhase,
            animating,
            showNowPlayingBar,
            hasPlaying,
            onBarAnimationComplete,
        ],
    );

    return <RemoteChromeContext.Provider value={value}>{children}</RemoteChromeContext.Provider>;
}
