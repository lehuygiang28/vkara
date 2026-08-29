export const URL_COMMAND_KNOWN_KEYS = [
    'roomId',
    'password',
    'joinToken',
    'layoutMode',
    'q',
    'karaoke',
    'provider',
    'name',
    'tab',
    'agent',
    'queue',
    'play',
    'next',
    'once',
    'exp',
] as const;

export type UrlCommandKnownKey = (typeof URL_COMMAND_KNOWN_KEYS)[number];

/** Kept on the URL; never applied as a room command. */
export const URL_COMMAND_RESERVED_KEYS = ['launch'] as const;

export type UrlCommandReservedKey = (typeof URL_COMMAND_RESERVED_KEYS)[number];

/** Parsed as unknown/ignored; never executed. */
export const URL_COMMAND_NEVER_KEYS = [
    'deviceId',
    'closeRoom',
    'leaveRoom',
    'lockRoom',
    'unlockRoom',
    'kick',
    'kickParticipant',
    'promote',
    'demote',
    'clearQueue',
    'clearHistory',
    'claimHost',
    'redirect',
    'nextUrl',
] as const;

export const ONCE_STORAGE_PREFIX = 'vkara:url-once:';
export const INTENT_STORAGE_PREFIX = 'vkara:url-intent:';

export const COMMAND_PATHS = ['/', '/en', '/tv', '/en/tv'] as const;
export type CommandPath = (typeof COMMAND_PATHS)[number];

export const IDENTITY_STRIP_KEYS = ['roomId', 'password', 'joinToken'] as const;
export const SECRET_STRIP_KEYS = ['password', 'joinToken'] as const;
export const ONE_SHOT_STRIP_KEYS = ['queue', 'play', 'next', 'once', 'exp'] as const;
export const SESSION_STRIP_KEYS = [
    'layoutMode',
    'q',
    'karaoke',
    'provider',
    'name',
    'tab',
    'agent',
] as const;
