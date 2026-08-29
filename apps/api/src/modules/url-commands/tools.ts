import type Redis from 'ioredis';

import {
    buildCommandUrl,
    generateOnceToken,
    parseUrlCommands,
    URL_COMMAND_NEVER_KEYS,
    type CommandPath,
} from '@vkara/url-commands';
import type { UrlCommandDocument } from '@vkara/validators';

import { ErrorCode, RoomError } from '@vkara/room';

import { loadRoom } from '@/utils/room-store';
import { mintJoinToken } from './join-token';

export type McpBind = {
    roomId: string;
    displayName: string;
};

export function echoBind(bind: McpBind): McpBind {
    return { roomId: bind.roomId, displayName: bind.displayName };
}

export function validateCommandQuery(query: string) {
    return parseUrlCommands(query);
}

export function buildBoundCommandUrl({
    origin,
    path,
    command,
    bind,
}: {
    origin: string;
    path: CommandPath;
    command: UrlCommandDocument;
    bind: McpBind;
}): { url: string; bind: McpBind } {
    for (const key of URL_COMMAND_NEVER_KEYS) {
        if (key in command) {
            throw new Error(`Refused destructive URL key "${key}"`);
        }
    }
    if (command.password) {
        throw new Error('Refused password in command URL; mint a joinToken');
    }
    if (command.roomId && command.roomId !== bind.roomId) {
        throw new Error('Refused mutating URL for a different roomId');
    }
    const hasMutation = Boolean(command.queue || command.play || command.next);
    const nextCommand: UrlCommandDocument = {
        ...command,
        roomId: bind.roomId,
        name: command.name ?? bind.displayName,
        once: hasMutation ? (command.once ?? generateOnceToken()) : command.once,
    };
    return {
        url: buildCommandUrl({ origin, path, command: nextCommand }),
        bind: echoBind(bind),
    };
}

export async function mintBoundJoinToken(redis: Redis, bind: McpBind, password?: string) {
    const room = await loadRoom(bind.roomId);
    if (!room) {
        throw new RoomError(ErrorCode.ROOM_NOT_FOUND);
    }
    const expected = room.password?.trim();
    if (expected && expected !== password?.trim()) {
        throw new RoomError(ErrorCode.INCORRECT_PASSWORD);
    }
    const minted = await mintJoinToken(redis, bind.roomId);
    return { ...minted, bind: echoBind(bind) };
}

export function mintOnce(): { once: string } {
    return { once: generateOnceToken() };
}
