# Phone cabinet and watch_videos import

This document records the design locked on 14 Nov 2026 for issue #14 and for importing a YouTube `watch_videos` URL. It explains the choices. The implementation steps live in `docs/superpowers/plans/2026-11-14-phone-cabinet.md`.

## What the singer gets

Tomorrow, the phone still has the songs that person saved. They open **Bài tủ** and send one song, or the whole list, into the room. The TV plays the room queue. The TV does not keep a cabinet of its own.

The import field also accepts a URL of this shape:

`https://www.youtube.com/watch_videos?video_ids=ID1,ID2,ID3`

No YouTube login is involved in either behavior.

## Why the cabinet is on the phone

A room's queue and history live in Redis. An empty room is deleted after `EMPTY_ROOM_TIMEOUT` (default 3600 seconds). The browser copy of the room keeps a rejoin stub and drops the queue. That is why yesterday's songs are gone.

`localStorage` belongs to one browser, not to a role. The phone remote and the `/tv` player are two browsers. One cannot read the other's storage. Search, history, and import already live on the remote. `/tv` only plays the room queue.

A merged cabinet (phone plus TV plus room) would need a copy inside the room so the phone could see the TV. That copy dies with the room, which is the bug this work is fixing. Two phones would also overwrite one shared list.

The cabinet is therefore one ordered list of `YouTubeVideo` on the phone browser. The room queue stays the shared list. Songs meet the room only when the phone sends them.

Saving history was rejected. History is every song the room already played, including other people's songs, and it excludes a song that was found but not played. Issue #14 asks for a favorite control on items.

## Cabinet behavior

The stored shape is `{ videos: YouTubeVideo[] }`. Index 0 is the newest save. Each video id appears once. The storage key is `vkara-cabinet`. It is not inside the room persist blob.

The first save of an id inserts that video at index 0. A later save of the same id removes it. The list keeps at most 200 videos. A new save past 200 drops the video at the end. 200 is the same ceiling as one playlist import.

Parsing stored JSON happens when the cabinet store hydrates. Entries without a string id are dropped. Duplicate ids keep the first stored entry.

**Bài tủ** is an item in the remote **More** menu, next to **History**. The bottom bar stays **Search**, **Queue**, and **Controls**. `/tv` gains no cabinet screen.

The save control sits on the action bar of search results, browse suggestions, curated playlist preview, the queue, history, and the cabinet itself. A saved row shows a star beside the title. The first press saves. The second press removes.

From the cabinet, each row can play now, add to the queue, or play next, using the same room requirement as those actions elsewhere. The toolbar can add every saved video to the room, and can clear the cabinet after a confirm. Clearing the cabinet does not change the room.

Add-all sends one `addVideos` message with the saved `YouTubeVideo` objects, in cabinet order, at most 200. It does not build a `watch_videos` URL. A measured `watch_videos` request drops the whole list when one id is invalid.

The server keeps TikTok rows. It drops YouTube rows that fail the existing embed check. It skips ids already playing or already in the queue. When the room has nothing playing and an empty queue, the first remaining video starts playback and the rest become the queue. Otherwise the remaining videos append to the queue. If every video was non-embeddable, the server returns `videoNotFound`. If every remaining video was already in the room, the server returns `alreadyInQueue`.

## watch_videos import

A live request on 14 Nov 2026 to `watch_videos?video_ids=Cfa2FTJG7CQ,9bZkp7q19f0,kJQP7kiw5Fk` returned HTTP 303 to `watch?v=Cfa2FTJG7CQ&list=TLGGph6XLhEqeG8xNDExMjAyNg` with no login cookie. A second request with the same ids returned the same list id. An anonymous InnerTube browse of that list returned three `lockupViewModel` rows in that order, titled "Untitled List". Sixty ids came back as 50 videos. A bad token, a space after a comma, or an empty `video_ids` redirected to `/watch` with no `list`.

`parseYoutubePlaylistInput` rejects a `watch_videos` URL because that URL has no list id. A URL that already contains `list=TL…` parses as a normal playlist. The import field must accept the `watch_videos` form itself.

The phone validates the URL before send. The server follows the redirect, then uses the existing playlist fetch on the `list` it finds. The cabinet does not store that `TL` id. The id is a temporary YouTube token. The durable import input is the `watch_videos` URL.

Validation rules:

- The host is `youtube.com`, `www.youtube.com`, `m.youtube.com`, or `music.youtube.com`, and the path is `/watch_videos`.
- `video_ids` is a comma-separated list. Every token must be an 11-character YouTube video id. One bad token rejects the URL.
- More than 50 valid ids keeps the first 50, matching the measured YouTube cap.
- The server follows at most four redirects. Each hop must stay on `youtube.com`, `www.youtube.com`, `m.youtube.com`, or `music.youtube.com`. Any other host is an invalid playlist and is not fetched. It stops at the first `Location` that has a `list` parameter and fetches that URL. No `list` after those hops is an invalid playlist.

## Out of scope

The TV player does not show or store a cabinet. The room does not store a cabinet. History stays room-scoped. There is no account and no sync between browsers.
