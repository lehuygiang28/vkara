## Requirements

### Requirement: Playlist endpoint returns metadata and videos

The API `POST /playlist` endpoint MUST return both playlist metadata and a video list. Metadata MUST include at minimum `id`, `title`, and `videoCount`. Metadata MAY include `thumbnails` and channel name. The video list MUST use the existing `YouTubeVideo` shape used elsewhere in the app.

#### Scenario: Client requests playlist by list id

- **WHEN** the client sends a valid YouTube playlist id or resolvable playlist URL
- **THEN** the response includes `playlist` metadata from YouTube
- **AND** the response includes `videos` array for that playlist

#### Scenario: Invalid playlist id

- **WHEN** the playlist id is missing or not found on YouTube
- **THEN** the API returns an appropriate error response
- **AND** the client can show a user-visible error state

### Requirement: Optional video limit for preview

The endpoint MUST support limiting the number of videos returned for preview use cases via request parameters (e.g. `videoLimit` or existing `fetchAll` semantics documented in design).

#### Scenario: Preview requests limited videos

- **WHEN** the client requests a playlist with a video limit for preview
- **THEN** the response videos array length MUST NOT exceed that limit
- **AND** playlist metadata still reflects full playlist where YouTube provides total count

### Requirement: Full import unchanged on server

Full playlist import for the room queue MUST continue to use the WebSocket `importPlaylist` handler with existing append, embed filtering, deduplication, and auto-play-first-when-idle behavior. This requirement MUST NOT change server import semantics.

#### Scenario: Import entire playlist from preview

- **WHEN** the user confirms import entire playlist
- **THEN** the client sends `importPlaylist` over the existing WebSocket
- **AND** server queue mutation behavior matches pre-change import behavior
