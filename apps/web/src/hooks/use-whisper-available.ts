'use client';

import { useEffect, useState } from 'react';

export function useWhisperAvailable() {
    const [whisperAvailable, setWhisperAvailable] = useState(false);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const response = await fetch('/api/speech/status');
                if (!response.ok) {
                    return;
                }
                const data = (await response.json()) as { whisperAvailable?: boolean };
                if (!cancelled) {
                    setWhisperAvailable(Boolean(data.whisperAvailable));
                }
            } catch {
                if (!cancelled) {
                    setWhisperAvailable(false);
                }
            } finally {
                if (!cancelled) {
                    setChecked(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return { whisperAvailable, checked };
}
