## MODIFIED Requirements

### Requirement: Playlist endpoint returns metadata and videos

The API `POST /playlist` endpoint MUST return both playlist metadata and a video list. Metadata MUST include at minimum `id`, `title`, and `videoCount`. Metadata MAY include `thumbnails` and channel name. The video list MUST use the existing `YouTubeVideo` shape used elsewhere in the app. When `VKARA_EMBED_PREFILTER_AT_LIST` is enabled, the `videos` array in the response MUST only include videos that pass the shared embed playability resolver (non-embeddable entries MUST be omitted). When the flag is disabled, the video list MUST NOT be filtered by embed playability. Cached playlist detail blobs MUST store the unfiltered YouTube video list; embed filtering MUST be applied on serve after reading the cache, not when writing the cache entry.

#### Scenario: Client requests playlist by list id

- **WHEN** the client sends a valid YouTube playlist id or resolvable playlist URL
- **THEN** the response includes `playlist` metadata from YouTube
- **AND** the response includes `videos` array for that playlist

#### Scenario: Invalid playlist id

- **WHEN** the playlist id is missing or not found on YouTube
- **THEN** the API returns an appropriate error response
- **AND** the client can show a user-visible error state

#### Scenario: Prefilter enabled omits non-embeddable preview videos

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is enabled
- **AND** the client requests playlist details for preview
- **THEN** each video in `videos` MUST be embeddable per the shared resolver
- **AND** non-embeddable videos MUST NOT appear in the response

#### Scenario: Prefilter disabled keeps full preview list

- **WHEN** `VKARA_EMBED_PREFILTER_AT_LIST` is not enabled
- **AND** the client requests playlist details
- **THEN** the `videos` array MUST include all videos returned from the YouTube fetch path (subject only to existing video limit parameters)
