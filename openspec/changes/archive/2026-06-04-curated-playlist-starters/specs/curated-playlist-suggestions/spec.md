## ADDED Requirements

### Requirement: Curated suggestions on browse idle

When the user is on the browse/search surface with no active search query and no search results, the system MUST show curated playlist suggestions grouped by catalog if curated starter mode applies. Primary empty-state guidance to search MUST remain available. Curated suggestions MUST NOT appear when the user is viewing search results.

#### Scenario: Cold start empty queue

- **WHEN** the user opens browse with no search query, no search results, and curated starter mode is active
- **THEN** curated playlist cards appear grouped by catalog (e.g. karaoke)
- **AND** each card shows title and thumbnail from YouTube metadata after fetch

#### Scenario: User has search results

- **WHEN** the user has performed a search and results are displayed
- **THEN** curated starter blocks MUST NOT replace or overlay search results

### Requirement: Curated suggestions on queue empty

When the queue is empty, the system MUST show curated playlist suggestions in addition to existing empty-state and search affordances.

#### Scenario: Empty queue tab

- **WHEN** the user views the queue tab with zero queued items
- **THEN** curated playlist suggestions are visible
- **AND** the user can open preview or import from those suggestions

### Requirement: Curated suggestions in import playlist menu

The import-playlist menu MUST list curated starter playlists so the user can select one for quick import or preview without pasting a URL.

#### Scenario: Open import menu

- **WHEN** the user opens the import playlist control in the queue UI
- **THEN** configured starter playlists appear as selectable entries

### Requirement: Playlist preview overlay

Tapping a curated playlist card MUST open a preview overlay listing songs in that playlist. The preview MUST use the same per-video queue actions as search (add to queue, play now, play next where applicable). The user MUST be able to add individual songs without importing the full playlist.

#### Scenario: Preview shows songs

- **WHEN** the user opens preview for a starter playlist
- **THEN** the system fetches playlist details from the API
- **AND** displays the video list with loading and error states

#### Scenario: Add single song from preview

- **WHEN** the user adds one song from the preview list
- **THEN** the client uses the existing add-video flow
- **AND** the current tab MUST NOT switch to queue solely because of that action
- **AND** the preview overlay MAY remain open

### Requirement: Import entire playlist switches to queue tab

When the user chooses to import the entire curated playlist, the client MUST invoke the existing WebSocket import flow and MUST switch the active tab to queue after initiating that action.

#### Scenario: Import all from preview

- **WHEN** the user confirms import entire playlist from preview
- **THEN** the client sends `importPlaylist` for that list id
- **AND** the UI switches to the queue tab

### Requirement: Browse does not swap feed during preview

While the curated playlist preview overlay is open on the browse surface, the system MUST NOT replace the underlying browse content with the personalized related/browse feed solely because `playingNow` or room history changed.

#### Scenario: First song starts during preview

- **WHEN** the user adds songs from curated preview while on browse
- **AND** `playingNow` becomes non-null
- **THEN** the browse surface underneath MUST NOT abruptly switch from curated starters to personalized feed until the user closes preview or dismisses curated starter mode

### Requirement: Dismiss curated starter mode via search

When the user starts a search from curated context, the system MUST treat curated starter mode as dismissed for the session so personalized browse feed can take over when feed sources exist.

#### Scenario: User taps search from empty browse

- **WHEN** the user activates search from the browse empty state
- **THEN** curated starter blocks are no longer the primary browse idle experience for that session

### Requirement: Playlist card content from API

Curated playlist cards MUST display title, thumbnail, and video count from YouTube via the playlist details API. Application code MUST NOT require hardcoded playlist titles in TypeScript for default display.

#### Scenario: Card renders after metadata fetch

- **WHEN** playlist metadata has been fetched successfully
- **THEN** the card shows YouTube playlist title and count
- **AND** shows a loading or skeleton state before metadata arrives

### Requirement: Localized UI strings only

Section headings, catalog labels, and button labels for curated UI MUST come from locale files (`vi`, `en`). Playlist titles MUST NOT be duplicated in locale files unless an explicit future override mechanism is added.

#### Scenario: UI locale English

- **WHEN** UI locale is `en`
- **THEN** curated section headings and actions display English strings from locale files
- **AND** playlist titles remain YouTube-provided
