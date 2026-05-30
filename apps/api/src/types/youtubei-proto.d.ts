declare module 'youtubei/dist/esm/youtube/SearchResult/proto/index.js' {
    import type { SearchOptions } from 'youtubei';

    type ProtoEncoder = {
        encode: (message: Record<string, unknown>) => { finish: () => Uint8Array };
    };

    export const SearchProto: ProtoEncoder;
    export const optionsToProto: (options: SearchOptions) => Record<string, unknown>;
}
