'use client';

import React from 'react';
import { PlayerControls } from './PlayerControls';

export function PlayerControlsTabs() {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <PlayerControls variant="panel" />
        </div>
    );
}
