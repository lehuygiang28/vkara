'use client';

import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { ROOM_ID_LENGTH } from '@vkara/room';

import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';

type TvRoomCodeInputProps = {
    value: string;
    onChangeAction: (value: string) => void;
};

function cycleDigit(current: string | undefined, delta: number): string {
    const num = current && /^\d$/.test(current) ? Number.parseInt(current, 10) : 0;
    return String((num + delta + 10) % 10);
}

function focusNextAfterDigit(index: number) {
    if (index < ROOM_ID_LENGTH - 1) {
        setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(index + 1));
        return;
    }
    setFocus(TV_FOCUS_KEYS.lobbyPassword);
}

export function TvRoomCodeInput({ value, onChangeAction }: TvRoomCodeInputProps) {
    const slots = Array.from({ length: ROOM_ID_LENGTH }, (_, index) => value[index] ?? '');

    const setDigit = (index: number, digit: string) => {
        const next = Array.from({ length: ROOM_ID_LENGTH }, (_, i) => slots[i] ?? '');
        next[index] = digit;
        onChangeAction(next.join(''));
    };

    return (
        <div className="tv-lobby-code" role="group" aria-label="Room code">
            {slots.map((digit, index) => (
                <TvFocusable
                    key={index}
                    focusKey={TV_FOCUS_KEYS.lobbyCodeDigit(index)}
                    accessibilityLabel={`Room code digit ${index + 1}`}
                    suppressFocusChrome
                    onEnterPress={() => focusNextAfterDigit(index)}
                    onArrowPress={(direction) => {
                        if (direction === 'left') {
                            if (index > 0) {
                                setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(index - 1));
                            } else {
                                setFocus(TV_FOCUS_KEYS.lobbyCreate);
                            }
                            return false;
                        }
                        if (direction === 'right') {
                            if (index < ROOM_ID_LENGTH - 1) {
                                setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(index + 1));
                            } else {
                                setFocus(TV_FOCUS_KEYS.lobbyPassword);
                            }
                            return false;
                        }
                        if (direction === 'up') {
                            setDigit(index, cycleDigit(digit, 1));
                            return false;
                        }
                        if (direction === 'down') {
                            setDigit(index, cycleDigit(digit, -1));
                            return false;
                        }
                        return true;
                    }}
                    className={({ focused }) =>
                        cn('tv-lobby-code-digit', focused && 'tv-lobby-code-digit--focused')
                    }
                >
                    <span className="tv-lobby-code-digit__value" aria-hidden>
                        {digit || '–'}
                    </span>
                </TvFocusable>
            ))}
        </div>
    );
}
