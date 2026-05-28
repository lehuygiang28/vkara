'use client';

import React from 'react';
import { PlayerControls } from './PlayerControls';

export function PlayerControlsTabs() {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-safe-offset pb-remote-scroll pt-safe-offset">
            <PlayerControls variant="panel" className="py-2" />
        </div>
    );
}
