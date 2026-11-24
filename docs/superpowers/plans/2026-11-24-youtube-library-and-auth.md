# YouTube library and optional account import

The singer keeps today's search, queue, and TV player. Version 1 adds two gated changes. Metadata calls move from `youtubei` to `youtubei.js` only after a mapper proves the current `YouTubeVideo` fields still fill. A phone button can import that person's own YouTube playlists. The TV embed stays on `https://www.youtube-nocookie.com`.

Package versions on this tree are `0.0.x` (`package.json` is `0.0.1`). No doc names a product "version 0". Nothing here has shipped as 1.0.

## Pull requests

| Id | Branches from | Waits for | Review before merge | Files |
| --- | --- | --- | --- | --- |
| `yt-mapper-spike` | `main` | nothing | no | `apps/api/src/modules/youtube/ytjs-map.ts`, `apps/api/tests/modules/youtube/ytjs-map.test.ts` |
| `yt-metadata-client` | `main`, then rebase onto `yt-mapper-spike` | spike pass below | yes | `apps/api/src/modules/youtube/*`, `apps/api/package.json`, `apps/api/src/types/youtubei-proto.d.ts` |
| `phone-youtube-import` | `main` | nothing | yes | `apps/web` import UI, `packages/env` public client id |

`phone-youtube-import` does not add an API module. The phone calls the YouTube Data API itself. `yt-metadata-client` does not add a Google OAuth client. `ytjs-map.ts` sits beside `video-mapper.ts` until the cutover deletes the `youtubei` mapper.

If the spike fails its pass line, skip `yt-metadata-client`. Open `youtubei-1.8.17` instead. That pull request only bumps `youtubei` from `1.8.16` to `1.8.17` and reruns the existing YouTube tests.

## What stayed out

- A hand-written Innertube parser. Both libraries already own that work.
- Signing the TV browser into YouTube. Android TV rejects any navigation whose origin is not the vkara host (`apps/android-tv/App.tsx`).
- Storing YouTube cookies or a refresh token on the API. The shared client in `youtubei-client.ts` is anonymous, and `youtubei-native-fetch.ts` would attach an OAuth bearer only to `/player`.
- A promise of ad-free playback. The player is `react-youtube` on `youtube-nocookie.com` (`apps/web/src/components/player/youtube-tv-embed.tsx`). YouTube Help says that mode does not personalize views, and that ads served there are non-personalized. The page does not say Premium removes those ads.
- Likes, subscriptions writes, and watch history. History is not in the Data API. Writes from a shared room act on one person's real account.

## Evidence already run

On 24 Nov 2026, Node `v22.23.4` ran `youtubei.js@18.3.0` once against live YouTube with `retrieve_player: false`. npm `latest` the same day was `youtubei@1.8.17` (published 2026-10-07) and `youtubei.js@18.3.0` (published 2026-10-23). vkara locks `youtubei@1.8.16`.

That run is one sample. It is not a latency budget. Bootstrap was 2 requests and returned WEB client `2.20261123.08.00`. `youtubei@1.8.17` still hardcodes `2.20260720.04.00` in `dist/esm/youtube/constants.js`.

| Call | Result |
| --- | --- |
| Search `hello adele karaoke` | 20 `Video` rows, then 20 from the continuation. First row author `Sing King`, `is_verified` true, view label present. |
| Suggestions `hello ade` | 14 strings. |
| Playlist `PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj` | 100 `LockupView` rows, 199 after one continuation. First row text parts were the title, `Lady Gaga`, `1.9B`, `2y ago`. |
| Same playlist, 15 rows | No verified badge string in the parsed node. |
| Mix `RDdQw4w9WgXcQ` via `getPlaylist` | Throws `This playlist type is unviewable.` |
| Mix via `getInfo` on the watch URL | 25 items. |
| Related for `dQw4w9WgXcQ` | 20 `LockupView` rows, then 20 more. |
| `/player` basic info for that id | `UNPLAYABLE`, reason `The page needs to be reloaded.`, `embeddable` false. |

`parseYoutubeViewCountText` in `packages/youtube/src/parse-view-count.ts` already parses labels like `1.9B`. Playlist verified still comes from a `/browse` of the channel in `channel-verified.ts`. The embed HTML probe in `embeddable.ts` stays, because `playability_status.embeddable` was false for a video the iframe can play.

Bun `1.4.4` was not repeated here. The image only had a musl `bun` binary, and the dynamic linker is glibc.

## `yt-mapper-spike`

- [ ] Depends on nothing.
- [ ] Files. Add `ytjs-map.ts` and its test. Do not change route handlers.
- [ ] One change. Map a `youtubei.js` search `Video`, a playlist `LockupView`, and a related `LockupView` into `YouTubeVideo` from `packages/youtube/src/youtube.ts`. Use `parseYoutubeViewCountText` for view labels. Leave embed prefilter in `prepare-youtube-videos.ts`. The mapper does not decide embeddability.
- [ ] Result you see. The unit test builds those three fixtures with no network and asserts the fixture's known `id`, `title`, `duration`, `url`, and thumbnail `url`. Each video also has `duration_formatted`, `uploadedAt`, numeric `views`, and `channels[0].name`. `isLive` is true only when the node says the video is live. Search fixtures set `channels[0].verified` from `author.is_verified`. Playlist fixtures set `verified` to false when the node has no badge.
- [ ] Pass line for the next pull request. Every field in the result line is filled for all three fixtures. `youtube-sr` is unused by the mapper. A spike that only fills `id`, `title`, channel name, and `views` does not pass.
- [ ] Unit. `bunx vitest run --config vitest.config.mts apps/api/tests/modules/youtube/ytjs-map.test.ts` passes.
- [ ] Live. One manual run, not in CI. Search, the playlist id above, and related for `dQw4w9WgXcQ` each return at least one mapped video with a non-empty title. Record the raw node type next to the mapped video in the pull request comment.
- [ ] Perf. No request path changes. Record wall time of the live script once. The number does not gate merge.

## `yt-metadata-client`

- [ ] Depends on the spike pass line.
- [ ] Files. Every `from 'youtubei'` import. That includes `apps/api/src/youtubei.ts`, `apps/api/src/modules/youtube/cache.ts`, the other call sites under `apps/api/src/modules/youtube/`, `apps/api/src/types/youtubei-proto.d.ts`, and the tests under `apps/api/tests/modules/youtube/`. Also `apps/api/package.json`. Keep `embeddable.ts`, `channel-verified.ts`, and the mix fallback shape in `fetch-playlist-videos.ts` until a live mix import returns the same count the HTML fallback returns today.
- [ ] One change. `Innertube.create({ retrieve_player: false, fetch })` uses `youtubeOutboundFetch`. Point `fetch-search-suggestions.ts` at `getSearchSuggestions` before deleting `youtube-sr`. Routes still return the same JSON. Delete the `youtubei` and `youtube-sr` dependencies, `youtubei-native-fetch.ts`, and `youtubei-proto.d.ts` only after `rg "from 'youtubei'" apps/api` prints nothing.
- [ ] Result you see. `POST /search`, `POST /playlist`, `POST /related`, and `POST /suggestions` return the same response types as today.
- [ ] Snapshot gate. For one search id, one playlist id, and one related id, compare the prepared video with trunk `mapYoutubeiVideo` output. `id`, `title`, `duration`, `isLive`, and `channels[0].name` match. `views` stays in the same compact bucket from `parseYoutubeViewCountText` (`K`, `M`, or `B`). At least one thumbnail URL is present. Embed skip still comes from `embeddable.ts`, not from `playability_status.embeddable`.
- [ ] Unit. `bunx vitest run --config vitest.config.mts apps/api/tests/modules/youtube` passes.
- [ ] Live. Against a local API, search `karaoke` returns a video with `id`, `title`, and `channels[0].name`. Playlist import of `PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj` returns a first row with a non-empty title. Related for `dQw4w9WgXcQ` returns a list. `POST /check-embeddable` for that id still reads the embed HTML page.
- [ ] Perf. Cold-cache `POST /search` for `karaoke`. Measure 5 trunk runs and 5 branch runs after one warmup each. Ignore non-200 responses. Fail only when every branch time is slower than every trunk time. Overlap means inconclusive. This number includes YouTube's own response time.

## `phone-youtube-import`

- [ ] Depends on nothing.
- [ ] Files. Phone UI under `apps/web`. Add `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` beside the other `NEXT_PUBLIC_` values in `packages/env` and `.env.example`. The browser calls `https://www.googleapis.com/youtube/v3/playlists`, `playlistItems`, and `videos`.
- [ ] One change. A signed-in phone user can copy their own playlists into the existing `vkara-cabinet` list. The TV page gains no account screen. The client id is the public OAuth client for that deployment. A build without it hides the button.
- [ ] Token handling. The access token stays in phone memory and goes only to `googleapis.com`. vkara does not receive it. Playlist titles stay on that phone until the user confirms the cabinet write. The room WebSocket does not carry those titles.
- [ ] Pages and details. Follow `nextPageToken` on `playlists.list` and `playlistItems.list`. Stop when the cabinet has no free slot or when 200 new ids are collected. `playlistItems.list` has no duration and no view count. Fill those from `videos.list` before the confirm write.
- [ ] Cabinet write. The write is `applyCabinetWrite` with `'add'` from `apps/web/src/lib/cabinet.ts`. `toggle` removes an id that is already saved, so the import path leaves that function unused. An id already in the cabinet stays. Re-read `vkara-cabinet` and merge, with the same retry `toggle` uses, so a save in another tab is not replaced by a stale list. Stop at 200 videos. Older saved songs stay. The confirm line shows how many songs were added and how many did not fit.
- [ ] Shared browser. Rows land in the device key `vkara-cabinet` with no account id. A later person on that browser sees them, the same as a song saved by hand. The confirm line says so. The plan does not split the cabinet by Google account.
- [ ] Result you see. On the phone, **Import from my YouTube** lists that account's playlists, including a later page, and a confirm writes the new songs into **Bài tủ**. A second confirm does not remove them. The room queue changes only after the existing cabinet send action. A second phone in the room does not see the list.
- [ ] Unit. A parser test maps a two-page `playlistItems.list` fixture plus a `videos.list` fixture into `YouTubeVideo` rows with duration and views, drops a row with no video id, and leaves an existing cabinet id in place when the import is applied with `applyCabinetWrite`.
- [ ] Live. With a test Google account, the phone lists at least one playlist the account owns, including one that is private on youtube.com. The playlist request host is `googleapis.com`. The TV embed for a queued public video still loads from `youtube-nocookie.com`. The iframe request has no `Authorization` header.
- [ ] Perf. No Innertube path changes. Record one `playlists.list` quota cost (1 unit per page in the Data API docs) in the pull request comment. The number does not gate merge.

## Unproven

- Premium inside a `youtube-nocookie.com` iframe.
- `playability_status.embeddable` on a residential IP. This run saw a false `UNPLAYABLE` from `/player`.
- Whether a later `youtubei.js` build puts a verified badge on playlist `LockupView` rows.
- Bun keep-alive behavior of `youtubei.js` on a long-lived API process.
- Google app verification for a `youtube.readonly` client. An unverified app shows a warning and caps users.
- Tizen sign-in. The plan does not use it.
