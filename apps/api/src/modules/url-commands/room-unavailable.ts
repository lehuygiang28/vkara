export const ROOM_UNAVAILABLE = 'roomUnavailable' as const;

export class RoomUnavailableError extends Error {
    readonly status = 401;
    readonly error = ROOM_UNAVAILABLE;

    constructor() {
        super(ROOM_UNAVAILABLE);
        this.name = 'RoomUnavailableError';
    }
}

export function roomUnavailableBody() {
    return { error: ROOM_UNAVAILABLE };
}
