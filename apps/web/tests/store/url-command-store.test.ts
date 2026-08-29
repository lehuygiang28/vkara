import { describe, expect, it } from 'vitest';

import { parseUrlCommands } from '@vkara/url-commands';

import { useUrlCommandStore } from '@/store/urlCommandStore';

describe('urlCommandStore secret merge', () => {
    it('keeps password while roomId remains, then drops secrets when roomId is gone', () => {
        useUrlCommandStore.setState({ snapshot: null, createdAt: 0 });
        useUrlCommandStore.getState().setSnapshot(parseUrlCommands('roomId=4821&password=secret'));
        useUrlCommandStore.getState().setSnapshot(parseUrlCommands('roomId=4821'));
        expect(useUrlCommandStore.getState().snapshot?.document.password).toBe('secret');

        useUrlCommandStore.getState().setSnapshot(parseUrlCommands('launch=1'));
        expect(useUrlCommandStore.getState().snapshot?.document.password).toBeUndefined();
        expect(useUrlCommandStore.getState().snapshot?.document.joinToken).toBeUndefined();
    });

    it('drops previous secrets when the invite roomId changes', () => {
        useUrlCommandStore.setState({ snapshot: null, createdAt: 0 });
        useUrlCommandStore.getState().setSnapshot(parseUrlCommands('roomId=4821&password=old'));
        useUrlCommandStore.getState().setSnapshot(parseUrlCommands('roomId=9999'));
        expect(useUrlCommandStore.getState().snapshot?.document).toEqual({ roomId: '9999' });
    });

    it('does not keep a spent joinToken after clearSecrets', () => {
        useUrlCommandStore.setState({ snapshot: null, createdAt: 0 });
        useUrlCommandStore
            .getState()
            .setSnapshot(parseUrlCommands('roomId=4821&joinToken=abcdefgh'));
        useUrlCommandStore.getState().clearSecrets();
        expect(useUrlCommandStore.getState().snapshot?.document.joinToken).toBeUndefined();
        expect(useUrlCommandStore.getState().snapshot?.document.roomId).toBe('4821');
    });
});
