export enum ErrorCode {
    INTERNAL_ERROR = 'internalError',
    INVALID_MESSAGE = 'invalidMessage',
    ROOM_NOT_FOUND = 'roomNotFound',
    NOT_IN_ROOM = 'notInRoom',
    INCORRECT_PASSWORD = 'incorrectPassword',
    ROOM_CLOSED = 'roomClosed',
    NOT_CREATOR_OF_ROOM = 'notCreatorOfRoom',
    ALREADY_IN_QUEUE = 'alreadyInQueue',
    VIDEO_NOT_FOUND = 'videoNotFound',
}

export interface ErrorResponse {
    type: 'error' | 'errorWithCode';
    code?: ErrorCode;
    message?: string;
}

export class RoomError extends Error {
    constructor(public code: ErrorCode, message?: string) {
        super(message || getDefaultErrorMessage(code));
        this.name = 'RoomError';
    }
}

function getDefaultErrorMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
        [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred',
        [ErrorCode.INVALID_MESSAGE]: 'Invalid message received',
        [ErrorCode.ROOM_NOT_FOUND]: 'Room not found',
        [ErrorCode.NOT_IN_ROOM]: 'You are not in a room',
        [ErrorCode.INCORRECT_PASSWORD]: 'Incorrect room password',
        [ErrorCode.ROOM_CLOSED]: 'Room has been closed',
        [ErrorCode.NOT_CREATOR_OF_ROOM]: 'Only the room creator can perform this action',
        [ErrorCode.ALREADY_IN_QUEUE]: 'Video is already in queue',
        [ErrorCode.VIDEO_NOT_FOUND]: 'Video not found',
    };
    return messages[code];
}
