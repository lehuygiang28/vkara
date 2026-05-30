import type { InputHTMLAttributes } from 'react';

type RoomFieldInputProps = Pick<
    InputHTMLAttributes<HTMLInputElement>,
    'autoComplete' | 'autoCorrect' | 'autoCapitalize' | 'spellCheck' | 'name'
> & {
    'data-1p-ignore'?: boolean;
    'data-lpignore'?: string;
};

/**
 * Room join/create fields are not login forms — disable browser and password-manager autofill.
 */
export const roomCodeFieldProps = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: 'vkara-room-code',
    'data-1p-ignore': true,
    'data-lpignore': 'true',
} satisfies RoomFieldInputProps;

export const roomSecretFieldProps = {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    name: 'vkara-room-secret',
    'data-1p-ignore': true,
    'data-lpignore': 'true',
} satisfies RoomFieldInputProps;
