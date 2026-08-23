export const CREATOR_HANDLE = '@lehuygiang28';
export const CREATOR_GITHUB_URL = 'https://github.com/lehuygiang28';
export const CREATOR_LEGAL_NAME = 'Lê Huy Giang';
export const CREATOR_EMAIL = 'lehuygiang28@gmail.com';

export function buildCreatorPerson() {
    return {
        '@type': 'Person' as const,
        name: CREATOR_LEGAL_NAME,
        alternateName: CREATOR_HANDLE,
        url: CREATOR_GITHUB_URL,
    };
}
