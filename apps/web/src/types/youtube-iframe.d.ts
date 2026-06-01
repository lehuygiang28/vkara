/**
 * YouTube IFrame Player API — missing from `@types/youtube` `Player` class.
 * @see https://developers.google.com/youtube/iframe_api_reference#loadModule
 * @see https://developers.google.com/youtube/iframe_api_reference#setOption
 */
declare namespace YT {
    interface CaptionsTrackOption {
        languageCode?: string;
    }

    /** Raw entry from `getOption('captions', 'tracklist')` (undocumented shape). */
    interface CaptionsTrackListItem {
        languageCode?: string;
        languageName?: string;
        displayName?: string;
        kind?: string;
        name?: string;
    }

    interface Player {
        loadModule?(moduleName: string): void;
        getOption?(
            module: 'captions',
            option: 'tracklist',
        ): CaptionsTrackListItem[] | null | undefined;
        getOption?(module: 'captions', option: 'track', value?: never): CaptionsTrackOption | null;
        getOption?(module: string, option: string): unknown;
        setOption?(
            module: 'captions',
            option: 'track',
            value: CaptionsTrackOption | CaptionsTrackListItem | Record<string, never>,
        ): void;
    }

    interface Events {
        onApiChange?: (event: PlayerEvent) => void;
    }
}
